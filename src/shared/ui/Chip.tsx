import React from "react";
import { View, Pressable, ScrollView } from "react-native";
import { radius, layout } from "../designSystem";
import { useTheme } from "../useTheme";
import { haptic } from "../touchFeedback";
import { Text } from "./Text";

type Tone =
  "neutral" | "moss" | "apricot" | "success" | "warning" | "danger" | "info";

export function Chip({
  label,
  tone = "neutral",
  selected,
  onPress,
  icon,
}: {
  label: string;
  tone?: Tone;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
}) {
  const theme = useTheme();

  const tones: Record<Tone, { bg: string; fg: string; border: string }> = {
    neutral: {
      bg: theme.surface.sunken,
      fg: theme.text.secondary,
      border: theme.border.default,
    },
    moss: {
      bg: theme.accents.moss.tint,
      fg: theme.accents.moss.color,
      border: theme.accents.moss.color,
    },
    apricot: {
      bg: theme.accents.apricot.tint,
      fg: theme.accents.apricot.color,
      border: theme.accents.apricot.color,
    },
    success: {
      bg: theme.success.bg,
      fg: theme.success.text,
      border: theme.success.border,
    },
    warning: {
      bg: theme.warning.bg,
      fg: theme.warning.text,
      border: theme.warning.border,
    },
    danger: {
      bg: theme.danger.bg,
      fg: theme.danger.text,
      border: theme.danger.border,
    },
    info: { bg: theme.info.bg, fg: theme.info.text, border: theme.info.border },
  };

  const t = selected ? tones.moss : tones[tone];

  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: layout.chipHeight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.full,
        backgroundColor: t.bg,
        borderWidth: 1,
        borderColor: selected ? t.border : theme.border.default,
      }}
    >
      {icon}
      <Text variant="label-sm" style={{ color: t.fg }}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => haptic("select")}
      accessibilityRole="button"
      // `selected` rather than `checked`: these are single-choice filters, and
      // a screen reader should say "selected", not "checked".
      accessibilityState={{ selected: Boolean(selected) }}
      aria-selected={Boolean(selected)}
      accessibilityLabel={label}
      hitSlop={6}
    >
      {body}
    </Pressable>
  );
}

/**
 * A horizontally scrolling row of chips.
 *
 * The gutter is bled into the padding so the first and last chips sit flush
 * with the page margin while the row still scrolls edge to edge — a row that
 * stops short of the screen edge looks like it has run out of content.
 */
export function ChipRow({
  children,
  gutter = 0,
}: {
  children: React.ReactNode;
  gutter?: number;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: gutter }}
      style={{ marginHorizontal: -gutter }}
    >
      {children}
    </ScrollView>
  );
}
