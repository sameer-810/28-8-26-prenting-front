import React from "react";
import { Text as RNText, TextStyle, StyleProp } from "react-native";
import { typography, fonts } from "../designSystem";
import { useTheme } from "../useTheme";
import { scriptFace, scriptLineHeight, type LanguageCode } from "../fonts";

/**
 * All typography routes through here.
 *
 * Beyond the usual reasons (one type scale, one set of tones), this component
 * carries the product's vernacular rule: pass `language` and the text renders
 * in that script's face, at that script's line height, in that script's
 * direction. Every parent-facing string in a session does exactly that.
 */

type Variant =
  | "display-lg"
  | "display-md"
  | "display-sm"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "body-lg"
  | "body"
  | "body-sm"
  | "label-lg"
  | "label"
  | "label-sm"
  | "caption"
  | "overline";

type Tone =
  | "primary"
  | "secondary"
  | "tertiary"
  | "disabled"
  | "inverse"
  | "accent"
  | "link"
  | "danger"
  | "success"
  | "warning";

interface Props {
  variant?: Variant;
  tone?: Tone;
  weight?: "400" | "500" | "600";
  align?: "left" | "center" | "right";
  numberOfLines?: number;
  /**
   * Renders in this language's script. Omit for UI chrome (which is English);
   * pass the parent's home language for anything the AI generated for them.
   */
  language?: LanguageCode;
  /** Tabular figures — for streaks, scores, timers. */
  numeric?: boolean;
  maxFontSizeMultiplier?: number;
  selectable?: boolean;
  /**
   * For text whose visual form carries meaning a screen reader would miss —
   * a lone "*" that means "required", a glyph standing in for a word.
   */
  accessibilityLabel?: string;
  accessibilityRole?: "text" | "header" | "link" | "none";
  /**
   * For a word INSIDE a paragraph that can be acted on — the tap-to-define
   * lookup. A wrapping Pressable cannot be used for this: it would break the
   * line into boxes and the passage would stop wrapping and justifying as
   * prose, which matters most in the scripts a parent reads aloud.
   */
  onPress?: () => void;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

const variantMap = {
  "display-lg": typography.display.large,
  "display-md": typography.display.medium,
  "display-sm": typography.display.small,
  h1: typography.heading.h1,
  h2: typography.heading.h2,
  h3: typography.heading.h3,
  h4: typography.heading.h4,
  "body-lg": typography.body.large,
  body: typography.body.default,
  "body-sm": typography.body.small,
  "label-lg": typography.label.large,
  label: typography.label.medium,
  "label-sm": typography.label.small,
  caption: typography.caption,
  overline: typography.overline,
} as const;

/**
 * How far each role may grow when the OS text size is turned up.
 *
 * THIS IS NOT AN ACCESSIBILITY OPT-OUT. React Native's `<Text>` already scales
 * with the OS setting; what it lacks is a ceiling. At iOS's largest
 * accessibility size React multiplies by 3.571, which turns a 12px chip label
 * into 43px inside a 32px chip — and since RN 0.85, text overflowing a rounded
 * corner is CLIPPED rather than spilled, so it does not look broken, it silently
 * disappears.
 *
 * So the choice is not "scale or don't". It is "scale into a readable layout"
 * or "scale into an invisible one". Content — scripts, questions, page titles —
 * is deliberately absent from this table and therefore uncapped, because that
 * is the text somebody with low vision actually needs bigger. Only chrome that
 * lives in a fixed slot is capped.
 */
const MAX_SCALE: Partial<Record<Variant, number>> = {
  overline: 1.3,
  "label-sm": 1.4,
  caption: 1.5,
  label: 1.6,
  "label-lg": 1.6,
  h4: 1.6,
  h3: 1.6,
  "display-sm": 1.5,
  "display-md": 1.5,
  "display-lg": 1.5,
  // body, body-sm, body-lg, h1, h2 are ABSENT = uncapped. They carry the
  // content and must reach 200%+ for WCAG 1.4.4.
};

function latinFamilyFor(variant: Variant, weight?: string) {
  const isDisplay = variant.startsWith("display") || variant === "h1";
  if (isDisplay) return weight === "400" ? fonts.displayRegular : fonts.display;
  if (weight === "600") return fonts.semibold;
  if (weight === "500") return fonts.bodyMedium;
  if (weight === "400") return fonts.bodyRegular;
  return undefined; // Keep the variant's own family.
}

export function Text({
  variant = "body",
  tone = "primary",
  weight,
  align,
  numberOfLines,
  language,
  numeric,
  maxFontSizeMultiplier,
  selectable,
  accessibilityLabel,
  accessibilityRole,
  onPress,
  style,
  children,
}: Props) {
  const theme = useTheme();
  const base = variantMap[variant];

  const toneMap: Record<Tone, string> = {
    primary: theme.text.primary,
    secondary: theme.text.secondary,
    tertiary: theme.text.tertiary,
    disabled: theme.text.disabled,
    inverse: theme.text.inverse,
    accent: theme.text.accent,
    link: theme.text.link,
    danger: theme.danger.text,
    success: theme.success.text,
    warning: theme.warning.text,
  };

  /**
   * A vernacular override replaces the family AND the line height together.
   * Changing the face without the leading is what makes Devanagari's headline
   * clip into the line above it — they are one decision, not two.
   */
  const script =
    language && language !== "en"
      ? (() => {
          const face = scriptFace(language, weight === "600" ? 600 : 400);
          return {
            fontFamily: face.fontFamily,
            lineHeight: scriptLineHeight(language, base.fontSize),
            writingDirection: face.writingDirection,
            textAlign: face.isRtl ? ("right" as const) : undefined,
          };
        })()
      : undefined;

  return (
    <RNText
      numberOfLines={numberOfLines}
      selectable={selectable}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      onPress={onPress}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_SCALE[variant]}
      style={[
        base,
        { color: toneMap[tone] },
        weight
          ? { fontWeight: weight, fontFamily: latinFamilyFor(variant, weight) }
          : undefined,
        numeric ? { fontVariant: ["tabular-nums"] } : undefined,
        script,
        align ? { textAlign: align } : undefined,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
