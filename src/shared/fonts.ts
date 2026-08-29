import { create } from "zustand";
import * as Font from "expo-font";

/**
 * Vernacular typography — the engineering half of PRD §4.3.
 *
 * WHY THE INDIC FAMILIES ARE LOADED LAZILY
 * ----------------------------------------
 * Inter has no Devanagari, Tamil, Telugu, Kannada or Bengali coverage at all.
 * Without a script-matched face the parent's teaching script renders in a
 * system fallback that matches neither the design nor has reliable weights —
 * and on the web there may be no fallback at all.
 *
 * But loading all six upfront is several hundred kilobytes of font for scripts
 * five families out of six will never see, on the first screen, over an Indian
 * mobile connection. So the Latin set loads at boot and exactly one Indic
 * family loads the moment the parent's language is known — which is at
 * onboarding, minutes before any script is displayed.
 *
 * Two further constraints that are NOT cosmetic:
 *
 *   · Indic scripts need more leading than Latin. Devanagari's shirorekha (the
 *     headline joining the letters) and Tamil's descenders clip at Latin's 1.4
 *     ratio. Each language carries its own ratio.
 *   · Urdu is right-to-left AND Nastaliq is a *sloped* calligraphic style — a
 *     line descends as it advances — so it needs 1.9 and a mirrored column,
 *     while the child's English column beside it stays left-to-right.
 */

export type LanguageCode = "en" | "hi" | "mr" | "ur" | "ta" | "te" | "kn" | "bn";

export interface ScriptFace {
  /** The family name to pass to `fontFamily`. */
  family: string;
  direction: "ltr" | "rtl";
  lineHeightRatio: number;
  /** Loads the font files. Resolves immediately if already loaded. */
  load: () => Promise<void>;
}

/**
 * Loaders are `import()`ed, and they import the PER-WEIGHT subpath.
 *
 * Two separate savings, and both were measured:
 *
 *   · Dynamic import puts each script in its own bundle chunk, so a
 *     Hindi-speaking family never downloads the Tamil loader. The web build
 *     emits six ~5KB chunks alongside the main bundle, which is that working.
 *   · Importing `@expo-google-fonts/noto-sans-telugu` pulls the package INDEX,
 *     which references all nine weights — Thin through Black. That put 85 font
 *     files and 16MB into the build output for the four faces actually used.
 *     Importing `.../400Regular` and `.../600SemiBold` directly takes only what
 *     is loaded.
 *
 * Regular and SemiBold are the only two weights the design system asks for in a
 * vernacular block, so those are the only two shipped.
 */
/** What a per-weight font module looks like once imported. */
type FontModule = Record<string, unknown>;

async function pair(
  regular: Promise<FontModule>,
  semibold: Promise<FontModule>,
): Promise<Record<string, number>> {
  const [r, s] = await Promise.all([regular, semibold]);
  const out: Record<string, number> = {};
  /**
   * The `default` key is dropped. A dynamic import wraps the module's own
   * namespace under `default` as well as spreading its named exports, and
   * passing that object straight to `Font.loadAsync` would register a font
   * literally named "default" pointing at a module object.
   */
  for (const [key, value] of Object.entries({ ...r, ...s })) {
    if (key !== "default") out[key] = value as number;
  }
  return out;
}

const LOADERS: Record<Exclude<LanguageCode, "en">, () => Promise<Record<string, number>>> = {
  hi: () =>
    pair(
      import("@expo-google-fonts/noto-sans-devanagari/400Regular"),
      import("@expo-google-fonts/noto-sans-devanagari/600SemiBold"),
    ),
  mr: () =>
    pair(
      import("@expo-google-fonts/noto-sans-devanagari/400Regular"),
      import("@expo-google-fonts/noto-sans-devanagari/600SemiBold"),
    ),
  ta: () =>
    pair(
      import("@expo-google-fonts/noto-sans-tamil/400Regular"),
      import("@expo-google-fonts/noto-sans-tamil/600SemiBold"),
    ),
  te: () =>
    pair(
      import("@expo-google-fonts/noto-sans-telugu/400Regular"),
      import("@expo-google-fonts/noto-sans-telugu/600SemiBold"),
    ),
  kn: () =>
    pair(
      import("@expo-google-fonts/noto-sans-kannada/400Regular"),
      import("@expo-google-fonts/noto-sans-kannada/600SemiBold"),
    ),
  bn: () =>
    pair(
      import("@expo-google-fonts/noto-sans-bengali/400Regular"),
      import("@expo-google-fonts/noto-sans-bengali/600SemiBold"),
    ),
  ur: () =>
    pair(
      import("@expo-google-fonts/noto-nastaliq-urdu/400Regular"),
      import("@expo-google-fonts/noto-nastaliq-urdu/600SemiBold"),
    ),
};

const SCRIPTS: Record<LanguageCode, Omit<ScriptFace, "load">> = {
  en: { family: "Inter_400Regular", direction: "ltr", lineHeightRatio: 1.45 },
  hi: { family: "NotoSansDevanagari_400Regular", direction: "ltr", lineHeightRatio: 1.65 },
  mr: { family: "NotoSansDevanagari_400Regular", direction: "ltr", lineHeightRatio: 1.65 },
  ta: { family: "NotoSansTamil_400Regular", direction: "ltr", lineHeightRatio: 1.7 },
  te: { family: "NotoSansTelugu_400Regular", direction: "ltr", lineHeightRatio: 1.7 },
  kn: { family: "NotoSansKannada_400Regular", direction: "ltr", lineHeightRatio: 1.7 },
  bn: { family: "NotoSansBengali_400Regular", direction: "ltr", lineHeightRatio: 1.65 },
  ur: { family: "NotoNastaliqUrdu_400Regular", direction: "rtl", lineHeightRatio: 1.9 },
};

/** Semibold counterparts, for headings inside a vernacular block. */
const SEMIBOLD: Record<LanguageCode, string> = {
  en: "Inter_600SemiBold",
  hi: "NotoSansDevanagari_600SemiBold",
  mr: "NotoSansDevanagari_600SemiBold",
  ta: "NotoSansTamil_600SemiBold",
  te: "NotoSansTelugu_600SemiBold",
  kn: "NotoSansKannada_600SemiBold",
  bn: "NotoSansBengali_600SemiBold",
  ur: "NotoNastaliqUrdu_600SemiBold",
};

interface FontState {
  /** Languages whose faces are loaded and safe to reference. */
  loaded: Record<string, boolean>;
  /** In-flight loads, so two components asking at once share one download. */
  pending: Record<string, Promise<void> | undefined>;
  ensure: (language: LanguageCode) => Promise<void>;
  isReady: (language: LanguageCode) => boolean;
}

export const useFontStore = create<FontState>((set, get) => ({
  loaded: { en: true },
  pending: {},

  /**
   * Never rejects.
   *
   * A font that fails to download must not break the screen: the text still
   * renders in the platform fallback, which is worse-looking but readable, and
   * that is strictly better than an error state between a parent and tonight's
   * session. `isReady` stays false so the UI can keep a subtle loading hint.
   */
  ensure: async (language) => {
    if (language === "en" || get().loaded[language]) return;

    const inFlight = get().pending[language];
    if (inFlight) return inFlight;

    const promise = (async () => {
      try {
        const assets = await LOADERS[language]();
        await Font.loadAsync(assets);
        set((s) => ({ loaded: { ...s.loaded, [language]: true } }));
      } catch {
        // Deliberately swallowed — see above.
      } finally {
        set((s) => ({ ...s, pending: { ...s.pending, [language]: undefined } }));
      }
    })();

    set((s) => ({ pending: { ...s.pending, [language]: promise } }));
    return promise;
  },

  isReady: (language) => language === "en" || Boolean(get().loaded[language]),
}));

/**
 * The face for a language, whether or not its files have arrived.
 *
 * Falls back to Inter until the download completes, so a component can render
 * immediately and re-render into the right face — rather than blocking on a
 * font, which is how a screen ends up blank on a slow connection.
 */
export function scriptFace(language: LanguageCode, weight: 400 | 600 = 400) {
  const ready = useFontStore.getState().isReady(language);
  const spec = SCRIPTS[language] || SCRIPTS.en;
  const family = weight === 600 ? SEMIBOLD[language] : spec.family;
  return {
    fontFamily: ready ? family : weight === 600 ? "Inter_600SemiBold" : "Inter_400Regular",
    writingDirection: spec.direction,
    lineHeightRatio: spec.lineHeightRatio,
    isRtl: spec.direction === "rtl",
    ready,
  };
}

/** The line height a given font size needs in a given script. */
export function scriptLineHeight(language: LanguageCode, fontSize: number) {
  return Math.round(fontSize * (SCRIPTS[language]?.lineHeightRatio ?? 1.45));
}

export { SCRIPTS, SEMIBOLD };
