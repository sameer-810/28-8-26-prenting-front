/**
 * Formatting, in one place.
 *
 * WHY THIS EXISTS. Dates were being formatted in six different screens with a
 * bare `toLocaleDateString()` — no locale argument — which renders in whatever
 * the device happens to be set to. A parent on a phone configured for US
 * English saw `8/31/2026` while the platform console, which did pass a locale,
 * showed `31 Aug 2026`. Two date formats in one product, decided by a setting
 * nobody chose deliberately.
 *
 * Everything here pins `en-IN`. This is a product for Indian households: prices
 * are in rupees and grouped in the Indian style (₹4,999 and then ₹1,00,000),
 * and dates are day-first because that is what a school diary uses.
 *
 * `Intl` formatters are created ONCE at module scope rather than per call.
 * Constructing one is genuinely expensive, and these run inside list rows that
 * render on every scroll frame.
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
