import React from "react";
import { View } from "react-native";
import { radius, palette } from "../designSystem";
import { useTheme } from "../useTheme";
import { Text } from "./Text";
import { VStack, HStack } from "./Stack";

/**
 * The four-band ladder — Building Foundations → Growing → Proficient → Fluent.
 *
 * The unrated state is a FIRST-CLASS appearance, not an empty bar. A child with
 * three sessions has not earned a verdict, and "2 more sessions to your first
 * rating" is encouraging where a bar sitting at zero reads as a failing grade
 * delivered on no evidence — in front of the child, on their parent's phone.
 */

const BANDS = [
  { key: "foundations", label: "Building Foundations", min: 0 },
  { key: "growing", label: "Growing", min: 45 },
  { key: "proficient", label: "Proficient", min: 65 },
  { key: "fluent", label: "Fluent & Confident", min: 85 },
] as const;

interface Props {
  rated: boolean;
  band: string;
  label: string;
  score: number;
  sessionsToRate?: number;
  /** Hides the band ladder underneath — for a compact dashboard card. */
  compact?: boolean;
}

export function FluencyMeter({ rated, band, label, score, sessionsToRate = 0, compact }: Props) {
  const theme = useTheme();
  const index = BANDS.findIndex((b) => b.key === band);

  if (!rated) {
    return (
      <VStack gap={8}>
        <Text variant="label" tone="tertiary">
          Fluency
        </Text>
        <View
          style={{
            height: 10,
            borderRadius: radius.full,
            backgroundColor: theme.surface.sunken,
            borderWidth: 1,
            borderColor: theme.border.subtle,
          }}
        />
        <Text variant="body-sm" tone="tertiary">
          {sessionsToRate > 0
            ? `${sessionsToRate} more session${sessionsToRate === 1 ? "" : "s"} to the first rating`
            : "Not rated yet"}
        </Text>
      </VStack>
    );
  }

  return (
    <VStack gap={8}>
      <HStack justify="space-between">
        <Text variant="label-lg" tone="accent">
          {label}
        </Text>
        <Text variant="label" tone="tertiary" numeric>
          {score}
        </Text>
      </HStack>

      <View
        style={{
          height: 10,
          borderRadius: radius.full,
          backgroundColor: theme.surface.sunken,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.max(2, Math.min(100, score))}%`,
            height: "100%",
            borderRadius: radius.full,
            backgroundColor: palette.moss[600],
          }}
        />
      </View>

      {!compact ? (
        <HStack justify="space-between" style={{ marginTop: 2 }}>
          {BANDS.map((b, i) => (
            <Text
              key={b.key}
              variant="label-sm"
              tone={i === index ? "accent" : "disabled"}
              // The scale reads as a ladder rather than four equal labels: the
              // ends anchor to their edges so the track underneath is legible.
              style={{
                flex: 1,
                textAlign: i === 0 ? "left" : i === BANDS.length - 1 ? "right" : "center",
              }}
            >
              {b.key === "foundations" ? "Foundations" : b.label.split(" ")[0]}
            </Text>
          ))}
        </HStack>
      ) : null}
    </VStack>
  );
}

export { BANDS };
