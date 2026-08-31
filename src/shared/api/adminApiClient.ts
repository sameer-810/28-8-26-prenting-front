import axios from "axios";
import { environment } from "@config/env";
import { useAdminStore } from "../store/useAdminStore";

/**
 * The axios instance for the platform console.
 *
 * `apiClient` injects the parent's token from `useAuthStore` in a request
 * interceptor. Teaching it to sometimes send an admin token instead would put
 * the choice of "whose credentials is this request carrying" inside a
 * conditional that every future call site inherits — and the one that got it
 * wrong would either fail confusingly or send staff credentials to a tenant
 * endpoint. Two clients, each with exactly one token, cannot make that mistake.
 *
 * Its base URL is the `/admin` namespace, so a path here can never accidentally
 * address a family route.
 */
export const adminApiClient = axios.create({
  baseURL: `${environment.apiUrl}/admin`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

adminApiClient.interceptors.request.use((config) => {
  const token = useAdminStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    /**
     * A 401 signs the admin out. It does NOT retry.
     *
     * The parent client refreshes here, because it has a refresh token and a
     * family may be mid-session. Admin tokens last two hours and the server
     * issues no refresh token at all, so there is nothing to retry with — an
     * expired staff session is a sign-in, by design. Attempting a refresh would
     * loop against an endpoint that does not exist.
     */
    if (error.response?.status === 401 && useAdminStore.getState().token) {
      await useAdminStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
