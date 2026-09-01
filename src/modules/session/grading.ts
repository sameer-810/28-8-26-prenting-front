/**
 * Client-side answer grading — a port of the server's
 * modules/practice/answerGrading.js. The duplication is intentional: the device
 * grades for instant FEEDBACK during a 6-minute phase that may have no network,
 * the server grades for the RECORD, and the server's verdict wins.
 *
 * KEEP THE TWO IN STEP. If they drift, a child sees "correct" and their report
 * later says otherwise. Equivalent test suites on both sides cover the same
 * cases.
 *
 * The bias is generous throughout: a child typing "1/2" for a stored "½" is
 * right, and a wrong mark looks like the child's fault where a crash looks like
 * the app's.
 */

const VULGAR: Record<string, string> = {
  "½": "1/2",
  "⅓": "1/3",
  "⅔": "2/3",
  "¼": "1/4",
  "¾": "3/4",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

const FILLER = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "it",
  "its",
  "of",
  "to",
  "=",
]);

export interface Question {
  prompt: string;
  options?: string[];
  answer: string;
  explanation?: string;
  skill?: string;
  unscored?: boolean;
}

export interface Verdict {
  correct: boolean;
  skipped: boolean;
  reason: string;
  needsSimplifying: boolean;
}

export function normalise(value: unknown): string {
  let s = String(value ?? "")
    .trim()
    .toLowerCase();
  for (const [glyph, plain] of Object.entries(VULGAR))
    s = s.split(glyph).join(plain);
  return (
    s
      .replace(/[₹$€£]/g, "")
      .replace(/,/g, "")
      // A trailing full stop is autocorrect, not arithmetic. Safe because a
      // decimal point is never last: "0.5" ends in a digit.
      .replace(/[.\s]+$/g, "")
      /**
       * Leading noise is whitespace and the "=" or ":" a child writes before
       * their answer — NOT a leading dot. Stripping "." here turned ".5" into
       * "5", a tenfold error on precisely the form a child types for "point
       * five". The server had the same bug; a unit test caught it there.
       */
      .replace(/^[\s=:]+/, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function normaliseWords(value: unknown): string {
  return normalise(value)
    .replace(/[^\p{L}\p{N}\s/.-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w))
    .join(" ");
}

export interface Numeric {
  value: number;
  isFraction: boolean;
  numerator?: number;
  denominator?: number;
}

export function parseNumeric(value: unknown): Numeric | null {
  const s = normalise(value);
  if (!s) return null;

  // Units are ignored: "12 cm" and "12" are the same arithmetic, and a child
  // who did the maths right should not lose it for omitting a unit the
  // question already stated.
  const stripped = s.replace(/\s*[a-z°%]+\.?$/i, "").trim() || s;

  const mixed = stripped.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const [, whole, num, den] = mixed.map(Number);
    if (den === 0) return null;
    const sign = whole < 0 ? -1 : 1;
    return {
      value: whole + sign * (num / den),
      isFraction: true,
      numerator: whole * den + sign * num,
      denominator: den,
    };
  }

  const frac = stripped.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const [, num, den] = frac.map(Number);
    if (den === 0) return null;
    return {
      value: num / den,
      isFraction: true,
      numerator: num,
      denominator: den,
    };
  }

  if (/^-?(\d+\.?\d*|\.\d+)$/.test(stripped)) {
    return { value: Number(stripped), isFraction: false };
  }
  return null;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

export function isSimplified(parsed: Numeric | null): boolean {
  if (!parsed?.isFraction) return true;
  return gcd(parsed.numerator ?? 0, parsed.denominator ?? 1) === 1;
}

/**
 * Resolves a multiple-choice answer to its option index, accepting every shape
 * a child might produce: the option's text, its letter, or its position.
 */
export function resolveOption(value: unknown, options?: string[]): number {
  if (!options?.length) return -1;
  const s = normalise(value);
  if (!s) return -1;

  const exact = options.findIndex((o) => normalise(o) === s);
  if (exact >= 0) return exact;

  const loose = options.findIndex(
    (o) => normaliseWords(o) === normaliseWords(s),
  );
  if (loose >= 0) return loose;

  if (/^[a-z]$/.test(s)) {
    const idx = s.charCodeAt(0) - 97;
    if (idx >= 0 && idx < options.length) return idx;
  }

  if (/^\d+$/.test(s)) {
    const n = Number(s);
    // 1-based first: that is what a human means by "option 2".
    if (n >= 1 && n <= options.length) return n - 1;
    if (n >= 0 && n < options.length) return n;
  }
  return -1;
}

export function grade(given: unknown, question: Question): Verdict {
  const expected = question?.answer ?? "";
  const options = question?.options;

  /**
   * Two cases that must NOT count against the child: a question from the
   * degraded template with no stored answer (the parent marks it), and a blank
   * because the phase timer ran out. Counting either as wrong would misreport
   * their accuracy, and that number propagates into their fluency band.
   */
  if (question?.unscored || normalise(expected) === "") {
    return {
      correct: false,
      skipped: true,
      reason: "unscored",
      needsSimplifying: false,
    };
  }
  if (given === null || given === undefined || normalise(given) === "") {
    return {
      correct: false,
      skipped: true,
      reason: "blank",
      needsSimplifying: false,
    };
  }

  if (options?.length) {
    const givenIdx = resolveOption(given, options);
    const expectedIdx = resolveOption(expected, options);
    if (givenIdx >= 0 && expectedIdx >= 0) {
      return {
        correct: givenIdx === expectedIdx,
        skipped: false,
        reason: "option",
        needsSimplifying: false,
      };
    }
    // Fall through: a malformed options array must not make a right answer wrong.
  }

  const g = parseNumeric(given);
  const e = parseNumeric(expected);
  if (g && e) {
    const equal = Math.abs(g.value - e.value) < 1e-9;
    return {
      correct: equal,
      skipped: false,
      reason: "numeric",
      /**
       * Right value, unsimplified form. Marked CORRECT with a nudge — the
       * child's arithmetic is right and only the simplification is missing, and
       * a red cross here teaches them that being right is not enough.
       *
       * Depends only on the child's own answer, never on how the model happened
       * to write the stored one.
       */
      needsSimplifying: equal && g.isFraction && !isSimplified(g),
    };
  }

  if (normalise(given) === normalise(expected)) {
    return {
      correct: true,
      skipped: false,
      reason: "exact",
      needsSimplifying: false,
    };
  }
  if (normaliseWords(given) === normaliseWords(expected)) {
    return {
      correct: true,
      skipped: false,
      reason: "text",
      needsSimplifying: false,
    };
  }

  return {
    correct: false,
    skipped: false,
    reason: "mismatch",
    needsSimplifying: false,
  };
}

/**
 * Session score.
 *
 * Accuracy is over ATTEMPTED questions, not all of them. A child who ran out of
 * time on the last two of six scored 4/4, not 4/6 — the timer is the product's
 * own constraint and must not be charged to the child.
 */
export function summarise(results: { correct: boolean; skipped: boolean }[]) {
  const total = results.length;
  const skipped = results.filter((r) => r.skipped).length;
  const attempted = total - skipped;
  const correct = results.filter((r) => r.correct).length;
  return {
    total,
    attempted,
    skipped,
    correct,
    incorrect: attempted - correct,
    accuracy: attempted > 0 ? correct / attempted : 0,
    completion: total > 0 ? attempted / total : 0,
  };
}
