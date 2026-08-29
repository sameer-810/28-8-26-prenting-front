import React from "react";
import { View, Pressable, ViewStyle, StyleProp } from "react-native";
import { radius, layout } from "../designSystem";
import { useTheme } from "../useTheme";
import { haptic } from "../touchFeedback";

interface Props {
  /** "flat" is the default: a hairline on the canvas, no shadow. */
  elevation?: "flat" | "raised" | "floating";
  padding?: "none" | "compact" | "default";
  tone?: "default" | "sunken" | "success" | "warning" | "danger" | "info" | "accent";
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children: React.ReactNode;
}

/**
 * The surface everything sits on.
 *
 * A resting card is a warm-white plane with a 1px hairline on the sand canvas —
 * no shadow. Shadow is reserved for things that genuinely float, because a page
 * where every card is lifted has no hierarchy left to express when something
 * actually needs to be.
 */
export function Card({
  elevation = "flat",
  padding = "default",
  tone = "default",
  onPress,
  style,
  accessibilityLabel,
  children,
}: Props) {
  const theme = useTheme();

  const tones = {
    default: { bg: theme.surface.primary, border: theme.border.default },
    sunken: { bg: theme.surface.sunken, border: theme.border.subtle },
    success: { bg: theme.success.bg, border: theme.success.border },
    warning: { bg: theme.warning.bg, border: theme.warning.border },
    danger: { bg: theme.danger.bg, border: theme.danger.border },
    info: { bg: theme.info.bg, border: theme.info.border },
    accent: { bg: theme.accents.apricot.tint, border: theme.apricot[200] },
  } as const;

  const t = tones[tone];
  const pad =
    padding === "none" ? 0 : padding === "compact" ? layout.cardPaddingCompact : layout.cardPadding;

  const body = (
    <View
      style={[
        {
          backgroundColor: t.bg,
          borderColor: t.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: pad,
        },
        elevation === "raised" ? theme.shadows.xs : undefined,
        elevation === "floating" ? theme.shadows.md : undefined,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => haptic("select")}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      // A pressable card dims rather than scales: cards are large, and scaling
      // one reads as the whole page moving.
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {body}
    </Pressable>
  );
}
