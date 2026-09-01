import { useMemo } from "react";
import { useColorScheme, StyleSheet } from "react-native";
import {
  palette,
  darkPalette,
  accents,
  darkAccents,
  shadows,
} from "./designSystem";

/**
 * The colour set for the appearance the device is currently in.
 *
 * Unlike the reference project this was modelled on, dark mode is wired from
 * the START here rather than retrofitted. That project's own notes record why:
 * once ~50 files declare `StyleSheet.create` at module scope with palette
 * values baked in, those styles physically cannot observe a theme change —
 * module scope runs once, at import, before any component mounts. No provider
 * or context fixes it; every one of those files has to be rewritten.
 *
 * So the rule in this codebase, from the first component: **no module-scope
 * StyleSheet that references a colour.** Use `makeStyles` below. Static styles
 * with no colour in them (flex, padding, alignment) are fine at module scope.
 */

export type ColorScheme = "light" | "dark";

/**
 * The token groups are declared by SHAPE, not by `typeof palette.x`. Both
 * palettes are `as const`, so their properties type as literals ("#FFFDF9",
 * not string) and the two sets refuse to unify. Naming the shape keeps the keys
 * checked while letting either scheme satisfy it.
 */
type Ramp = Record<
  50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900,
  string
>;
type Surfaces = Record<
  | "primary"
  | "secondary"
  | "tertiary"
  | "raised"
  | "sunken"
  | "dark"
  | "darkRaised",
  string
>;
type Inks = Record<
  | "primary"
  | "secondary"
  | "tertiary"
  | "disabled"
  | "inverse"
  | "accent"
  | "link",
  string
>;
type Borders = Record<
  "subtle" | "default" | "strong" | "focus" | "dark",
  string
>;
type Semantic = { bg: string; text: string; border: string };
type AccentPair = { color: string; tint: string };

export interface Theme {
  scheme: ColorScheme;
  isDark: boolean;
  surface: Surfaces;
  text: Inks;
  border: Borders;
  ink: Ramp;
  success: Semantic;
  warning: Semantic;
  danger: Semantic;
  info: Semantic;
  /** The brand ramps are identical in both schemes — they are the logo. */
  brand: Ramp;
  apricot: Ramp;
  accents: Record<keyof typeof accents, AccentPair>;
  /**
   * Shadow does almost nothing on a dark ground — depth there comes from a
   * lighter surface, not a darker shadow — so dark returns no-ops and relies
   * on `surface.raised` instead.
   */
  shadows: Record<keyof typeof shadows, object>;
}

function build(scheme: ColorScheme): Theme {
  const dark = scheme === "dark";
  const p = dark ? darkPalette : palette;
  return {
    scheme,
    isDark: dark,
    surface: p.surface,
    text: p.text,
    border: p.border,
    ink: dark ? darkPalette.ink : palette.ink,
    success: p.success,
    warning: p.warning,
    danger: p.danger,
    info: p.info,
    brand: palette.moss,
    apricot: palette.apricot,
    accents: dark ? darkAccents : accents,
    shadows: dark
      ? { ...shadows, xs: {}, sm: {}, md: {}, lg: {}, xl: {} }
      : shadows,
  };
}

const LIGHT = build("light");
const DARK = build("dark");

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "dark" ? DARK : LIGHT;
}

/**
 * Theme-aware replacement for a module-scope `StyleSheet.create`.
 *
 * Returns a hook. The sheet is rebuilt only when the scheme actually changes,
 * so this costs one memo per component rather than a new sheet per render.
 *
 *   const useStyles = makeStyles((t) => ({
 *     card: { backgroundColor: t.surface.primary, borderColor: t.border.default },
 *   }));
 *   // ...then inside the component:
 *   const styles = useStyles();
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
) {
  const cache = new Map<ColorScheme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => {
      const hit = cache.get(theme.scheme);
      if (hit) return hit;
      const sheet = StyleSheet.create(factory(theme));
      cache.set(theme.scheme, sheet);
      return sheet;
    }, [theme]);
  };
}
