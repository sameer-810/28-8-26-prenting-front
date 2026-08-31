import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboardApi";

/**
 * The dashboard's query key, named rather than written out at each call site.
 *
 * It is invalidated from several places — after a session completes, after a
 * child is added, after a plan is generated — and a raw `["dashboard"]` typed
 * out at each of those is one typo away from an invalidation that matches
 * nothing, silently leaving a stale screen behind with no error to notice.
 */
export const dashboardKeys = {
  all: ["dashboard"] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: dashboardApi.get,
  });
}
