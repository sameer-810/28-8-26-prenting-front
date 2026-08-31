import { apiClient, unwrap } from "@api/apiClient";
import type { Dashboard } from "../types";

/**
 * ONE aggregate request, deliberately.
 *
 * This is the first screen a parent sees, on a phone, often on a weak
 * connection, at the end of a working day. Six parallel requests would be six
 * chances to be slow and six spinners.
 */
export const dashboardApi = {
  async get() {
    return unwrap<Dashboard>(apiClient.get("/dashboard"));
  },
};

/**
 * Re-exported so existing imports keep working. The types LIVE in `../types`
 * — an api module owning its own shapes is what left them scattered across
 * seven modules with no single place to look.
 */
export type { Dashboard, ChildCard } from "../types";
