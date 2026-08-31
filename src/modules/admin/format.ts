/**
 * Formatting the platform console needs on top of the shared set.
 *
 * The generic formatters — currency, counts, percentages, dates — live in
 * `@shared/format` and are re-exported here so the console's screens keep one
 * import. They started in this file, which is how the parent app ended up
 * formatting dates six different ways while the console formatted them one
 * consistent way: the good version was module-scoped and nothing else could
 * reach it.
 */
import { pct } from "@shared/format";

export { rupees, count, pct, shortDate, dateTime, duration } from "@shared/format";

/**
 * A degradation rate derived from raw counts.
 *
 * `familyDetail` returns `calls` and `degraded`, while `overview` returns a
 * ready-made `degradedPct`. This exists so a screen reading the first payload
 * computes the figure rather than reaching for a `degradedPct` that is
 * `undefined` there — which would render a confident "0%" over a household
 * whose every plan had fallen back to a template.
 */
export function degradedRate(ai?: { calls: number; degraded: number }): string {
  if (!ai || !ai.calls) return "—";
  return pct(ai.degraded / ai.calls);
}

/** Human wording for a subscription state, matching what parents are shown. */
export function statusLabel(status: string): string {
  return (
    {
      trialing: "Free trial",
      active: "Active",
      past_due: "Payment failed",
      cancelled: "Cancelled",
      expired: "Expired",
    }[status] || status
  );
}

/** Which semantic tone a subscription state should carry. */
export function statusTone(status: string): "success" | "info" | "warning" | "neutral" | "danger" {
  return (
    ({
      active: "success",
      trialing: "info",
      past_due: "warning",
      cancelled: "neutral",
      expired: "danger",
    } as const)[status] || "neutral"
  );
}
