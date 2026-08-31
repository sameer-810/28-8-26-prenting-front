/**
 * ParentAI Design System — "Warm Calm". Full reasoning in
 * docs/03-design-system.md.
 *
 * The constraints that shaped it:
 *
 *   · Used 5–10pm, by a tired parent with a reluctant child. Calm is the
 *     operating condition, not a style.
 *   · Two audiences on one screen — a parent column in Marathi beside a child
 *     column in English.
 *   · Building Foundations → Fluent is a cultivation metaphor, so moss is the
 *     semantic colour of the promise rather than a brand choice.
 *
 * Everything is warm-tinted: no pure black, grey or white on a large surface.
 * That trace of warmth is what separates "warm calm" from "beige".
 */

export const palette = {
  /**
   * Brand — Moss. Olive-leaning green, deliberately NOT the cool mint of
   * clinical SaaS: warming the hue is what makes it read as *growth* rather
   * than *medical*, and it is what stops this product looking like a
   * pharmacy tool.
   */
  moss: {
    900: "#1B2A18",
    800: "#263D22",
    700: "#375A31", // primary button fill — 6.9:1 on the warm white
    600: "#4A7740", // logo green, active nav, focus ring
    500: "#5E9151",
    400: "#83B074",
    300: "#A9CB9D",
    200: "#CDE3C5",
    100: "#E4F0DF",
    50: "#F2F8EF",
  },

  /**
   * Accent — Apricot. Streaks, milestone cards, the celebration moment.
   * Roughly 2% of pixels on any screen, and never a surface.
   */
  apricot: {
    900: "#5E3413",
    800: "#7A4319",
    700: "#93521F", // text on light — 5.1:1
    600: "#B76A2C",
    500: "#D4863F",
    400: "#E3A468",
    300: "#EDBB8A",
    200: "#F5D6B8",
    100: "#FBEBDA",
    50: "#FDF6EE",
  },

  /** Ink — warm near-black, tinted brown so it belongs to the family. */
  ink: {
    900: "#1F1C17",
    800: "#2C2921",
    700: "#3B372F",
    600: "#524C41",
    500: "#6B6559",
    400: "#928B7C",
    300: "#C3BCAC",
    200: "#DED8CA",
    100: "#EDE9DF",
    50: "#F7F4EC",
  },

  surface: {
    /** Cards. Warm white, not #FFF. */
    primary: "#FFFDF9",
    /** The app canvas — warm sand. Cards are planes ON this. */
    secondary: "#F7F4EC",
    tertiary: "#F0ECE1",
    raised: "#FFFDF9",
    /** Wells, table headers, inputs at rest. */
    sunken: "#EDE9DF",
    dark: "#1A1813",
    darkRaised: "#231F19",
  },

  text: {
    primary: "#1F1C17",
    secondary: "#3B372F",
    /** 5.2:1 on the card surface. Carries every hint, label and timestamp. */
    tertiary: "#6B6559",
    disabled: "#A69E8E",
    inverse: "#FFFDF9",
    accent: "#375A31",
    /** 5.6:1 — links are body-size, so they need the full 4.5, not 3:1. */
    link: "#2C5F86",
  },

  border: {
    /** Row dividers inside a card. */
    subtle: "#EDE9DF",
    /** The hairline. Every card and panel edge in the app. */
    default: "#DED8CA",
    /** Inputs and anything that must read as interactive. */
    strong: "#C3BCAC",
    focus: "#4A7740",
    dark: "#2E2A22",
  },

  /**
   * Semantic, contrast-checked on #FFFDF9.
   *
   * `danger` is a cool-leaning brick held two hue-steps away from the apricot
   * accent, so "something went wrong" and "you earned a streak" can never be
   * confused at a glance. That collision is the one real risk of a warm
   * palette, and it is designed out rather than hoped away.
   */
  success: { bg: "#E4F0DF", text: "#356B2B", border: "#BEDCB4" },
  warning: { bg: "#FBF0DA", text: "#8A5A11", border: "#F0DCA9" },
  danger: { bg: "#FBE8E4", text: "#A93B29", border: "#F2C7BE" },
  info: { bg: "#E5EEF5", text: "#2C5F86", border: "#C0D6E6" },
} as const;

/** Preferred alias for the primary ramp. */
export const brand = palette.moss;

/**
 * Dark mode. NOT an inversion.
 *
 * A flipped light theme gives pure black behind pure white, which on OLED
 * smears and — for the astigmatic ~40% of adults — makes light text halo. This
 * is the elevation model instead: a warm dark ground with each layer slightly
 * lighter, and text topping out near #EDE9DF rather than white.
 *
 * The brand is lifted to 400: #375A31 is unreadable on a dark ground.
 */
export const darkPalette = {
  ink: {
    900: "#F7F4EC",
    800: "#EDE9DF",
    700: "#DED8CA",
    600: "#B5AE9E",
    500: "#928B7C",
    400: "#77705F",
    300: "#57503F",
    200: "#3A342A",
    100: "#2A251D",
    50: "#211D17",
  },
  surface: {
    primary: "#211E17",
    /** The canvas. Not #000 — black shows OLED smear on scroll. */
    secondary: "#16140F",
    tertiary: "#2A2620",
    raised: "#2A2620",
    sunken: "#1B1813",
    dark: "#0E0C09",
    darkRaised: "#211E17",
  },
  text: {
    primary: "#EDE9DF",
    secondary: "#C3BCAC",
    tertiary: "#928B7C",
    disabled: "#6B6559",
    inverse: "#1F1C17",
    accent: "#83B074",
    link: "#8FB8D6",
  },
  border: {
    subtle: "#2A2620",
    default: "#3A342A",
    strong: "#4C4536",
    focus: "#83B074",
    dark: "#0E0C09",
  },
  success: { bg: "#1B2E17", text: "#8FC97F", border: "#2E4A28" },
  warning: { bg: "#31240E", text: "#E0B368", border: "#4F3C1A" },
  danger: { bg: "#331A15", text: "#E89686", border: "#54291F" },
  info: { bg: "#152634", text: "#8FB8D6", border: "#254458" },
} as const;

/**
 * Status accents for metrics. The default is `none` — a number with no status
 * meaning gets no colour at all, which is how a dashboard avoids looking like
 * a box of highlighters.
 */
export const accents = {
  moss: { color: "#4A7740", tint: "#E4F0DF" },
  apricot: { color: "#B76A2C", tint: "#FBEBDA" },
  blue: { color: "#3D6B94", tint: "#E5EEF5" },
  clay: { color: "#A9603F", tint: "#F7E7DE" },
  neutral: { color: "#6B6559", tint: "#F0ECE1" },
} as const;

export const darkAccents = {
  moss: { color: "#83B074", tint: "#1B2E17" },
  apricot: { color: "#E3A468", tint: "#31240E" },
  blue: { color: "#8FB8D6", tint: "#152634" },
  clay: { color: "#D19878", tint: "#331F16" },
  neutral: { color: "#928B7C", tint: "#2A2620" },
} as const;

/** 4pt grid, semantic names. */
export const space = {
  none: 0,
  hair: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
} as const;

/**
 * Radii — softer than a data tool, per the 2026 soft-UI finding. Rounded
 * geometry reads as warmth and approachability, which is the job here.
 */
export const radius = {
  xs: 4,
  sm: 6,
  md: 10, // buttons, inputs, chips
  lg: 14, // cards
  xl: 18, // sheets, dialogs
  "2xl": 24, // hero panels
  full: 9999,
} as const;

export const outline = { width: 1, color: palette.border.default } as const;

/**
 * Typography — two families, used with discipline.
 *
 * Fraunces (a soft optical serif) carries display and H1 only: the child's
 * name, the milestone card, the fluency rating. Inter carries everything else.
 * The junior tell is a friendly display face used *indiscriminately*, not one
 * used for six words on a screen.
 *
 * `latin` here means the Latin-script UI. The parent's script is resolved at
 * runtime per language — see fonts.ts, which lazily loads exactly one Noto
 * family once the parent picks their home language.
 */
export const fonts = {
  display: "Fraunces_600SemiBold",
  displayRegular: "Fraunces_400Regular",
  heading: "Inter_600SemiBold",
  bodyRegular: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
} as const;

/** Tabular figures — for streak counts, scores, timers, money. */
export const numeric: { fontVariant: ["tabular-nums"] } = {
  fontVariant: ["tabular-nums"],
};

/**
 * Body sits at 15–16, not the 13–14 of a data tool: this is read aloud in dim
 * light by a tired adult, not scanned on a counter terminal.
 */
export const typography = {
  display: {
    large: {
      fontFamily: fonts.display,
      fontSize: 32,
      lineHeight: 38,
      fontWeight: "600" as const,
      letterSpacing: -0.6,
    },
    medium: {
      fontFamily: fonts.display,
      fontSize: 26,
      lineHeight: 32,
      fontWeight: "600" as const,
      letterSpacing: -0.4,
    },
    /** The big number — a streak, a score. */
    small: {
      fontFamily: fonts.display,
      fontSize: 22,
      lineHeight: 27,
      fontWeight: "600" as const,
      letterSpacing: -0.3,
    },
  },
  heading: {
    h1: {
      fontFamily: fonts.display,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "600" as const,
      letterSpacing: -0.3,
    },
    h2: {
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 25,
      fontWeight: "600" as const,
      letterSpacing: -0.2,
    },
    h3: {
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "600" as const,
      letterSpacing: -0.1,
    },
    h4: {
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "600" as const,
    },
  },
  body: {
    /** The parent's teaching script reads at this size. */
    large: {
      fontFamily: fonts.bodyRegular,
      fontSize: 16,
      lineHeight: 25,
      fontWeight: "400" as const,
    },
    default: {
      fontFamily: fonts.bodyRegular,
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "400" as const,
    },
    small: {
      fontFamily: fonts.bodyRegular,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "400" as const,
    },
  },
  label: {
    large: {
      fontFamily: fonts.semibold,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: "600" as const,
    },
    medium: {
      fontFamily: fonts.semibold,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "600" as const,
    },
    small: {
      fontFamily: fonts.semibold,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "600" as const,
      letterSpacing: 0.1,
    },
  },
  caption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
  },
  overline: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600" as const,
    letterSpacing: 0.6,
    textTransform: "uppercase" as const,
  },
} as const;

/**
 * Elevation. Resting surfaces get NO shadow — a hairline on a tinted canvas
 * does the separating. These are for things that genuinely float: the session
 * timer's sticky bar, dialogs, the capture button.
 */
const soft = (y: number, blur: number, opacity: number, elev: number) => ({
  shadowColor: "#1F1C17",
  shadowOffset: { width: 0, height: y },
  shadowOpacity: opacity,
  shadowRadius: blur,
  elevation: elev,
});

export const shadows = {
  none: {},
  xs: soft(1, 2, 0.04, 1),
  sm: soft(2, 6, 0.06, 2),
  md: soft(4, 14, 0.08, 4),
  lg: soft(10, 28, 0.11, 8),
  xl: soft(18, 40, 0.13, 14),
} as const;

export const elevation = {
  base: shadows.none,
  raised: shadows.xs,
  floating: shadows.md,
  overlay: shadows.lg,
} as const;

export const motion = {
  duration: { fast: 150, medium: 250, slow: 400 },
  spring: {
    gentle: { damping: 18, stiffness: 180 },
    default: { damping: 20, stiffness: 220 },
    bouncy: { damping: 12, stiffness: 200 },
    crisp: { damping: 25, stiffness: 300 },
  },
} as const;

/**
 * Gradients — kept for auth and celebration surfaces, where a brand moment is
 * the actual job. Never on a working screen.
 */
export const gradients = {
  hero: ["#375A31", "#4A7740", "#5E9151"] as const,
  moss: ["#4A7740", "#263D22"] as const,
  apricot: ["#D4863F", "#B76A2C"] as const,
  dawn: ["#FBEBDA", "#F2F8EF"] as const,
  light: ["#FFFDF9", "#F7F4EC"] as const,
} as const;

export const breakpoints = {
  sm: 640,
  md: 760,
  lg: 900,
  xl: 1100,
  xxl: 1280,
} as const;

export const layout = {
  screenPadding: 28,
  /** Phones get less — 28px on a 390px screen spends 14% of it on nothing. */
  screenPaddingPhone: 20,
  cardPadding: 18,
  cardPaddingCompact: 14,
  /** Consume via `useControlHeight()` — a pointer and a thumb want different. */
  controlHeight: 42,
  controlHeightPhone: 48,
  sectionGap: 24,
  itemGap: 12,
  sidebarWidth: 248,
  sidebarCollapsedWidth: 72,
  navRowHeight: 40,
  tabBarHeight: 66,
  tabBarClearance: 92,
  chipHeight: 32,
  rowHeight: 48,
  rowHeightPhone: 62,
  contentMaxWidth: 1180,
  /** At/above this the layout switches to the desktop sidebar shell. */
  wideBreakpoint: 900,
} as const;
