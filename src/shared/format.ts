/**
 * Formatting, in one place. Use these rather than `toLocaleDateString()` — a
 * bare call takes the DEVICE's locale, so a phone set to US English renders
 * `8/31/2026` where the rest of the app renders `31 Aug 2026`.
 *
 * Everything pins `en-IN`: rupees grouped Indian-style (₹4,999, ₹1,00,000) and
 * day-first dates, the way a school diary writes them.
 *
 * The `Intl` formatters are built once at module scope — constructing one is
 * expensive and these run inside list rows that re-render on scroll.
 */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const decimal = new Intl.NumberFormat("en-IN");

const shortDateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Paise to rupees. Every price in this product is stored in paise, because
 * money in a floating-point number is how ₹499 becomes ₹498.99999.
 */
export function rupees(paise: number | null | undefined): string {
  return inr.format((paise || 0) / 100);
}

/** A count, grouped Indian-style. */
export function count(n: number | null | undefined): string {
  return decimal.format(n || 0);
}

/** A 0–1 fraction as a whole percentage. */
export function pct(fraction: number | null | undefined): string {
  return `${Math.round((fraction || 0) * 100)}%`;
}

/**
 * "31 Aug 2026", or an em dash when there is no date.
 *
 * The dash matters: rendering "Invalid Date" or an empty cell in a table makes
 * a missing value look like a bug rather than a fact.
 */
export function shortDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return shortDateFmt.format(d);
}

/** "31 Aug, 09:48", or "never". */
export function dateTime(value: string | Date | null | undefined): string {
  if (!value) return "never";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "never";
  return dateTimeFmt.format(d);
}

/**
 * A duration in minutes, said the way a person would.
 *
 * "1h 30m" rather than "90 minutes" past the hour mark, because a parent
 * reading a week's total is comparing it against an evening, not counting.
 */
export function duration(minutes: number | null | undefined): string {
  const m = Math.max(0, Math.round(minutes || 0));
  if (m < 60) return `${m}m`;
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
