/**
 * Formatting for the console.
 *
 * Its own module rather than the app's, because the audiences differ. A parent
 * sees "₹499" and "2 days"; staff scan columns of counts and compare them, so
 * the numbers here are grouped Indian-style and rendered with tabular figures
 * wherever they sit above one another.
 */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const decimal = new Intl.NumberFormat("en-IN");

/** Paise to rupees. Every price in this product is stored in paise. */
export function rupees(paise: number): string {
  return inr.format((paise || 0) / 100);
}

export function count(n: number): string {
  return decimal.format(n || 0);
}

export function pct(fraction: number): string {
  return `${Math.round((fraction || 0) * 100)}%`;
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return "never";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * A degradation rate from raw counts.
 *
 * `familyDetail` returns `calls` and `degraded` while `overview` returns a
 * ready-made `degradedPct`, and this exists so a screen reading the first
 * payload derives the figure rather than reaching for a `degradedPct` that is
 * `undefined` there — which would render a confident "0%" over a household
 * whose every plan had fallen back to a template.
 */
export function degradedRate(ai?: { calls: number; degraded: number }): string {
  if (!ai || !ai.calls) return "—";
  return pct(ai.degraded / ai.calls);
}

/** Human wording for a subscription state, matching what the app shows parents. */
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
