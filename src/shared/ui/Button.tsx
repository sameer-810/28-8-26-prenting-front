import React from "react";
import { Pressable, View, ActivityIndicator, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { radius, motion, palette } from "../designSystem";
import { useTheme } from "../useTheme";
import {
  haptic,
  prefersReducedMotion,
  type FeedbackTone,
} from "../touchFeedback";
import { useBreakpoint } from "./useBreakpoint";
import { Text } from "./Text";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = "primary" | "secondary" | "ghost" | "accent" | "destructive";
type Size = "sm" | "md" | "lg";

interface Props {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  hapticTone?: FeedbackTone | "none";
  accessibilityHint?: string;
}

/**
 * Two size ladders, because this one codebase is both a phone app and a desktop
 * web app and the right control height is genuinely different.
 *
 * Every PHONE size is at least 44 — Apple's HIG floor — and they differ only in
 * padding and label size, never in how big a target a thumb gets. Density on a
 * pointer surface is a nicety; density on a touch surface is a mis-tap.
 */
const DESKTOP = {
  sm: { h: 34, px: 14, fs: 13 },
  md: { h: 40, px: 18, fs: 14 },
  lg: { h: 46, px: 24, fs: 15 },
};
const PHONE = {
  sm: { h: 44, px: 16, fs: 14 },
  md: { h: 48, px: 20, fs: 15 },
  lg: { h: 54, px: 26, fs: 16 },
};

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
  size = "md",
  icon,
  rightIcon,
  fullWidth = true,
  style,
  hapticTone,
  accessibilityHint,
}: Props) {
  const theme = useTheme();
  const { isWide } = useBreakpoint();
  const press = useSharedValue(0);
  const isDisabled = Boolean(disabled || loading);
  const s = (isWide ? DESKTOP : PHONE)[size];

  const c = variantColors(variant, theme);
  const tone: FeedbackTone | "none" =
    hapticTone ?? (c.borderWidth === 0 ? "impact" : "select");

  /**
   * The haptic fires on press-IN, not on press. Press-in is the moment the
   * finger lands, so the buzz arrives with the touch rather than ~80ms after
   * it; on `onPress` it reads as a delayed reaction to something you already
   * did.
   */
  const onPressIn = () => {
    if (!prefersReducedMotion()) press.set(withTiming(1, { duration: 90 }));
    if (tone !== "none") haptic(tone);
  };

  /**
   * The disabled dimming lives IN the worklet, not in the style array.
   *
   * Reanimated writes animated styles straight onto the node, so they beat
   * anything passed through `style` wherever it sits in the array. A resting
   * `opacity: 1` here would silently cancel a disabled state applied outside —
   * and a disabled button that renders at full strength looks perfectly
   * pressable and does nothing.
   */
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.get() * 0.03 }],
    opacity: (isDisabled ? 0.45 : 1) - press.get() * 0.1,
  }));

  return (
    <View style={[fullWidth ? { alignSelf: "stretch" } : undefined, style]}>
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        /**
         * Without a role this renders as an anonymous div: a screen reader
         * announces the label as plain text with no hint it does anything, and
         * nothing in the app can be found by role in testing.
         */
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
        aria-disabled={isDisabled}
        aria-busy={Boolean(loading)}
        onPressIn={onPressIn}
        onPressOut={() => press.set(withSpring(0, motion.spring.crisp))}
        style={[
          {
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
            // minHeight, not height: with OS text scaling turned up the label
            // needs more room than the slot, and a fixed height clips it —
            // silently, since RN 0.85 hides text overflowing a border radius.
            minHeight: s.h,
            paddingHorizontal: s.px,
            paddingVertical: 8,
            backgroundColor: c.bg,
            borderColor: c.border,
            borderWidth: c.borderWidth,
          },
          animStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={c.text} size="small" />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {icon}
            <Text
              variant="label"
              weight="600"
              style={{ color: c.text, fontSize: s.fs }}
            >
              {label}
            </Text>
            {rightIcon}
          </View>
        )}
      </AnimatedPressable>
    </View>
  );
}

function variantColors(v: Variant, theme: ReturnType<typeof useTheme>) {
  switch (v) {
    case "primary":
      /**
       * 700, not the 600 logo moss: button labels are 14–16px (normal-size
       * text) so the fill needs 4.5:1 against white. 600 gives 3.6, 700 gives
       * 6.9. Same brand hue, just deep enough to read all evening.
       */
      return {
        bg: theme.isDark ? palette.moss[500] : palette.moss[700],
        text: theme.isDark ? palette.ink[900] : "#FFFFFF",
        border: "transparent",
        borderWidth: 0,
      };
    case "accent":
      return {
        bg: theme.isDark ? palette.apricot[400] : palette.apricot[700],
        text: theme.isDark ? palette.ink[900] : "#FFFFFF",
        border: "transparent",
        borderWidth: 0,
      };
    case "secondary":
      return {
        bg: theme.surface.primary,
        text: theme.text.primary,
        border: theme.border.strong,
        borderWidth: 1,
      };
    case "ghost":
      return {
        bg: "transparent",
        text: theme.text.accent,
        border: "transparent",
        borderWidth: 0,
      };
    case "destructive":
      return {
        bg: theme.danger.text,
        text: "#FFFFFF",
        border: "transparent",
        borderWidth: 0,
      };
  }
}
