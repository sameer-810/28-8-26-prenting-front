import React from "react";
import { View } from "react-native";
import { Flame, Shield } from "lucide-react-native";
import { radius, palette } from "../designSystem";
import { useTheme } from "../useTheme";
import { Text } from "./Text";
import { HStack } from "./Stack";

/**
 * The streak, and — deliberately — how much forgiveness is left.
 *
 * Spec DECISION 6 forgives one missed day per rolling seven. Hiding that and
 * surprising a family with a preserved streak wastes the mechanic's whole
 * point: a parent who KNOWS missing tonight is survivable comes back tomorrow,
 * where one who assumes the streak is already lost does not.
 */
export function StreakBadge({
  days,
  graceRemaining,
  showGrace = true,
}: {
  days: number;
  graceRemaining?: number;
  showGrace?: boolean;
}) {
  const theme = useTheme();
  const active = days > 0;

  return (
    <HStack gap={8}>
      <HStack
        gap={5}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: radius.full,
          backgroundColor: active
            ? theme.accents.apricot.tint
            : theme.surface.sunken,
        }}
      >
        <Flame
          size={14}
          color={active ? palette.apricot[600] : theme.text.disabled}
          // Filled only when the streak is live — an outline flame at zero says
          // "not yet" without shouting about it.
          fill={active ? palette.apricot[500] : "none"}
        />
        <Text
          variant="label-sm"
          numeric
          style={{
            color: active ? theme.accents.apricot.color : theme.text.disabled,
          }}
        >
          {days === 0 ? "No streak yet" : `${days} day${days === 1 ? "" : "s"}`}
        </Text>
      </HStack>

      {showGrace && active && graceRemaining !== undefined ? (
        <HStack gap={4}>
          <Shield size={12} color={theme.text.tertiary} />
          <Text variant="caption" tone="tertiary">
            {graceRemaining > 0 ? "One rest day left" : "No rest day left"}
          </Text>
        </HStack>
      ) : null}
    </HStack>
  );
}

/** A dot per day, for the last week. Used on the child card. */
export function WeekDots({
  days,
}: {
  days: { dayKey: string; sessions: number }[];
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 5 }}>
      {days.slice(-7).map((d) => (
        <View
          key={d.dayKey}
          accessibilityLabel={`${d.dayKey}: ${d.sessions} sessions`}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor:
              d.sessions > 0 ? palette.moss[500] : theme.border.default,
          }}
        />
      ))}
    </View>
  );
}
