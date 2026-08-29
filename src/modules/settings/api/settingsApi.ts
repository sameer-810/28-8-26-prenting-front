import { Platform } from "react-native";
import { apiClient, unwrap } from "@api/apiClient";
import { environment } from "@config/env";
import { useAuthStore, type Family } from "@shared/store/useAuthStore";

export interface PlanOption {
  code: string;
  name: string;
  badge: string | null;
  priceInPaise: number;
  priceLabel: string;
  interval: string;
  intervalLabel: string;
  maxChildren: number;
  sessionsPerDay: number;
  features: string[];
  isCurrent: boolean;
  supportsCurrentChildren: boolean;
}

export interface SubscriptionState {
  current: {
    planCode: string;
    planName: string;
    status: string;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    cancelledAt: string | null;
  };
  childCount: number;
  plans: PlanOption[];
  /** False when the server has no Razorpay keys — checkout cannot be offered. */
  paymentsConfigured: boolean;
}

export const settingsApi = {
  async family() {
    return unwrap<Family>(apiClient.get("/family"));
  },

  async updateFamily(patch: {
    name?: string;
    homeLanguage?: string;
    studyWindow?: { startHour: number; endHour: number };
    notifications?: Partial<Family["notifications"]>;
  }) {
    return unwrap<Family>(apiClient.patch("/family", patch));
  },

  async consent() {
    return unwrap<{ accepted: boolean; acceptedAt: string | null; policyVersion: string }>(
      apiClient.get("/family/consent"),
    );
  },

  async devices() {
    return unwrap<
      { id: string; deviceName: string; platform: string; lastUsedAt: string; createdAt: string }[]
    >(apiClient.get("/auth/devices"));
  },

  async revokeDevice(id: string) {
    return unwrap<{ message: string }>(apiClient.delete(`/auth/devices/${id}`));
  },

  async changePassword(input: { currentPassword: string; newPassword: string }) {
    return unwrap<{ message: string }>(apiClient.post("/auth/change-password", input));
  },

  async activityLog() {
    return unwrap<
      { id: string; action: string; description: string; by: string; createdAt: string }[]
    >(apiClient.get("/activity-logs?limit=30"));
  },

  /**
   * Deletes the household and everything in it. Irreversible, owner-only, and
   * guarded by typing the family name — a checkbox is dismissed by muscle
   * memory, a name has to be read first.
   */
  async deleteFamily(confirmation: string) {
    return unwrap<{ message: string }>(
      apiClient.delete("/family", { data: { confirmation } }),
    );
  },
};

export const subscriptionApi = {
  async state() {
    return unwrap<SubscriptionState>(apiClient.get("/subscription"));
  },

  async history() {
    return unwrap<
      {
        id: string;
        event: string;
        planCode: string | null;
        status: string;
        amountInPaise: number;
        periodEnd: string | null;
        createdAt: string;
      }[]
    >(apiClient.get("/subscription/history"));
  },

  async createCheckout(planCode: string) {
    return unwrap<{
      subscriptionId: string;
      razorpayKeyId: string;
      planCode: string;
      planName: string;
      amountInPaise: number;
      currency: string;
      shortUrl: string | null;
    }>(apiClient.post("/subscription/checkout", { planCode }));
  },

  async confirmCheckout(input: {
    subscriptionId: string;
    paymentId: string;
    signature: string;
  }) {
    return unwrap<SubscriptionState>(apiClient.post("/subscription/checkout/confirm", input));
  },

  async cancel(immediately = false) {
    return unwrap<SubscriptionState>(apiClient.post("/subscription/cancel", { immediately }));
  },
};

/**
 * The DPDP data export.
 *
 * Streamed as an attachment by the API, so it needs the same
 * fetch-with-token-then-hand-to-the-platform treatment as the report PDFs — a
 * plain link carries no Authorization header.
 *
 * On native this returns the JSON text for the caller to share, rather than
 * writing a file: an export is a document the parent is exercising a legal
 * right to obtain, and putting it through the share sheet lets them decide
 * where it goes.
 */
export async function downloadExport(): Promise<{ ok: boolean; reason?: string }> {
  const token = useAuthStore.getState().token;
  try {
    const res = await fetch(`${environment.apiUrl}/family/export`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) return { ok: false, reason: `The server returned ${res.status}` };

    if (Platform.OS === "web") {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parentai-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return { ok: true };
    }

    const [{ File, Paths }, Sharing] = await Promise.all([
      import("expo-file-system"),
      import("expo-sharing"),
    ]);
    const text = await res.text();
    const file = new File(Paths.cache, `parentai-export-${Date.now()}.json`);
    file.create({ overwrite: true });
    file.write(text);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: "application/json" });
      return { ok: true };
    }
    return { ok: false, reason: "Saved to this device, but sharing isn't available here." };
  } catch (err) {
    return { ok: false, reason: (err as Error)?.message || "The export failed" };
  }
}

/**
 * Razorpay Checkout.
 *
 * NOT YET EXERCISABLE — the server has no Razorpay keys, so `createCheckout`
 * returns 503 and the UI says so rather than opening an empty modal. This is
 * the real integration, written against Razorpay's documented web flow, and it
 * is what will run the moment keys are configured. It has not been run against
 * a live gateway, and the settings screen says that too.
 *
 * The web flow loads Razorpay's script on demand: bundling it would add a
 * third-party script to every page load for a screen most parents visit once.
 */
export async function openRazorpayCheckout(input: {
  subscriptionId: string;
  razorpayKeyId: string;
  planName: string;
  parentName: string;
  parentEmail: string;
}): Promise<
  | { ok: true; paymentId: string; signature: string }
  | { ok: false; reason: string; dismissed?: boolean }
> {
  if (Platform.OS !== "web") {
    /**
     * Native needs `react-native-razorpay`, which is a native module and so
     * needs a development build rather than Expo Go. Stated plainly instead of
     * failing silently — a parent on the phone should be told to use the web
     * for now, not left tapping a dead button.
     */
    return {
      ok: false,
      reason: "Payments aren't available in the app yet. You can subscribe from the web.",
    };
  }

  const loaded = await loadRazorpayScript();
  if (!loaded) return { ok: false, reason: "Could not reach the payment provider." };

  return new Promise((resolve) => {
    const Razorpay = (window as unknown as { Razorpay?: new (o: unknown) => { open: () => void } })
      .Razorpay;
    if (!Razorpay) {
      resolve({ ok: false, reason: "Could not reach the payment provider." });
      return;
    }

    const rzp = new Razorpay({
      key: input.razorpayKeyId,
      subscription_id: input.subscriptionId,
      name: "ParentAI",
      description: input.planName,
      prefill: { name: input.parentName, email: input.parentEmail },
      theme: { color: "#375A31" },
      handler: (response: {
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) =>
        resolve({
          ok: true,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        }),
      modal: {
        // A dismissal is not a failure. Reported separately so the UI can stay
        // quiet rather than showing an error for a parent who changed their mind.
        ondismiss: () => resolve({ ok: false, reason: "Checkout closed", dismissed: true }),
      },
    });
    rzp.open();
  });
}

let scriptPromise: Promise<boolean> | null = null;
function loadRazorpayScript(): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}
