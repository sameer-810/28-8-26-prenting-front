import { useQuery } from "@tanstack/react-query";
import { settingsApi, subscriptionApi } from "../api/settingsApi";

/**
 * Query keys for settings and billing.
 *
 * THESE WERE THE WORST CASE FOR RAW ARRAYS. `["subscription"]` is created in
 * PlansScreen, read in SettingsScreen, and invalidated from three different
 * mutations across two files; `["devices"]` is created in AccountScreen and
 * invalidated by two mutations in the same file. Every one of those was typed
 * out by hand.
 *
 * An invalidation whose key does not match the query it meant to refresh does
 * not fail — it matches nothing and returns. The mutation reports success, the
 * screen keeps the old value, and nothing anywhere says so.
 *
 * `subscription()` is a PREFIX of `subscriptionHistory()` on purpose:
 * invalidating the first also clears the second, which is what should happen
 * when a plan changes.
 */
export const settingsKeys = {
  all: ["settings"] as const,
  devices: () => [...settingsKeys.all, "devices"] as const,
  subscription: () => ["subscription"] as const,
  subscriptionHistory: () => ["subscription", "history"] as const,
  /** The signed-in parent, invalidated when a plan changes their entitlements. */
  me: () => ["me"] as const,
};

export function useDevices() {
  return useQuery({
    queryKey: settingsKeys.devices(),
    queryFn: settingsApi.devices,
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: settingsKeys.subscription(),
    queryFn: subscriptionApi.state,
  });
}

export function useSubscriptionHistory() {
  return useQuery({
    queryKey: settingsKeys.subscriptionHistory(),
    queryFn: subscriptionApi.history,
  });
}
