import { useQuery } from "@tanstack/react-query";
import { settingsApi, subscriptionApi } from "../api/settingsApi";

/**
 * Query keys for settings and billing. Always use these — never a raw array.
 *
 * `subscription` is created in PlansScreen, read in SettingsScreen and
 * invalidated by three mutations across two files. An invalidation whose key
 * does not match does not fail: it matches nothing and returns, so the mutation
 * reports success while the screen keeps the stale value.
 *
 * `subscription()` is a PREFIX of `subscriptionHistory()`, so invalidating a
 * plan change clears both.
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
