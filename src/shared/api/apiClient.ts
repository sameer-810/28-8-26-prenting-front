import axios, { InternalAxiosRequestConfig } from "axios";
import { environment } from "@config/env";
import { useAuthStore } from "../store/useAuthStore";
import { useOfflineStore } from "../offline/useOfflineStore";

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL: environment.apiUrl,
  headers: { "Content-Type": "application/json" },
  /**
   * 30s. Long enough for the slowest thing the API does that a user waits on —
   * a multi-page OCR extraction — and short enough that a dead connection is
   * reported rather than hanging until the OS gives up.
   */
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    /**
     * Every completed round trip is proof of reachability — the cheapest
     * connectivity detector there is, and one that can never disagree with
     * reality the way `navigator.onLine` can.
     */
    useOfflineStore.getState().setOnline(true);
    return response;
  },
  async (error) => {
    // An HTTP error still travelled the wire; only a MISSING response means the
    // network itself is gone.
    if (error.response) useOfflineStore.getState().setOnline(true);
    else if (axios.isAxiosError(error)) useOfflineStore.getState().setOnline(false);

    const original = error.config as RetryableConfig | undefined;
    if (!original) return Promise.reject(error);

    if (original.url?.includes("/auth/refresh") || original._retry) {
      return Promise.reject(error);
    }

    const { token, refreshToken } = useAuthStore.getState();
    if (!token && !refreshToken) return Promise.reject(error);

    if (error.response?.status === 401) {
      original._retry = true;
      /**
       * `refreshSession` is the sole judge of whether this session dies: it
       * signs out only when the SERVER rejected the refresh token. A null here
       * can also mean the network was unreachable — signing out on that turns
       * every power cut into a lockout the parent cannot recover from, because
       * logging back in needs the very server that just went away.
       */
      const fresh = await useAuthStore.getState().refreshSession();
      if (fresh) {
        original.headers.Authorization = `Bearer ${fresh}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);

/** The server's machine-readable code, when it sent one. */
export function apiErrorCode(err: unknown): string | undefined {
  return (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error
    ?.code;
}

/** Whatever structured detail the server attached — suggestions, limits. */
export function apiErrorDetails<T = Record<string, unknown>>(err: unknown): T | undefined {
  return (err as { response?: { data?: { error?: { details?: T } } } })?.response?.data?.error
    ?.details;
}

/** Field name out of a zod path: ["body","child","name"] → "name". */
function fieldLabel(path: (string | number)[]) {
  const parts = path.filter((p) => p !== "body" && p !== "query" && p !== "params");
  const name = parts.filter((p) => typeof p === "string").pop();
  return name ? String(name) : "";
}

/**
 * A message worth showing a parent.
 *
 * Validation failures already name the offending field on the wire; dropping it
 * and showing only "Validation error" tells the user nothing and leaves a
 * developer reading server logs to find out which field a form was unhappy
 * about.
 */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong") {
  const e = err as {
    code?: string;
    response?: {
      data?: {
        error?: {
          message?: string;
          details?: { issues?: { path: (string | number)[]; message: string }[] };
        };
      };
    };
  };

  // No response at all — the network, not the server.
  if (!e?.response && (e?.code === "ERR_NETWORK" || e?.code === "ECONNABORTED")) {
    return "You appear to be offline. We'll retry when you're back.";
  }

  const error = e?.response?.data?.error;
  const plain = !error && err instanceof Error && err.message ? err.message : "";
  const message = error?.message || plain || fallback;

  const issues = error?.details?.issues;
  if (issues?.length) {
    const seen = new Set<string>();
    const detail = issues
      .map((i) => {
        const label = fieldLabel(i.path || []);
        return label ? `${label}: ${i.message}` : i.message;
      })
      .filter((d) => !seen.has(d) && seen.add(d))
      .slice(0, 3)
      .join(" · ");
    if (detail) return `${message} — ${detail}`;
  }
  return message;
}

/** Unwraps the `{ success, data }` envelope every endpoint returns. */
export async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}
