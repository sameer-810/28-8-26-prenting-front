import React from "react";
import { View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { palette } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { prefersReducedMotion } from "@shared/touchFeedback";
import { Text } from "@shared/ui/Text";
import { VStack } from "@shared/ui/Stack";
import { formatClock, type PhaseKey } from "../sessionRuntime";

export interface Segment {
  key: PhaseKey;
  index: number;
  share: number;
  fill: number;
  active: boolean;
  completed: boolean;
}

/**
 * The 30-minute countdown — one ring, five segments sized to their allocations
 * (10/8/6/3/3 minutes).
 *
 * The numeric time and phase name are always in the middle, so the ring is
 * decoration over readable text rather than the only way to know where you are.
 * One accessibility node with a spoken label: five unlabelled SVG paths are
 * worse than nothing. Nothing animates under `prefers-reduced-motion`.
 */
export function SessionRing({
  segments,
  remainingSeconds,
  phaseTitle,
  phaseIndex,
  overrunning,
  paused,
  size = 208,
}: {
  segments: Segment[];
  remainingSeconds: number;
  phaseTitle: string;
  phaseIndex: number;
  overrunning: boolean;
  paused: boolean;
  size?: number;
}) {
  const theme = useTheme();
  const reduceMotion = prefersReducedMotion();

  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  /** A hairline gap between segments so five arcs read as five, not as one. */
  const gap = 3;

  /**
   * Each arc starts where the previous one ended, so the five segments have to
   * be walked in order with a running offset.
   *
   * A plain `for` rather than `map` over a `let` declared outside it: a closure
   * that mutates a binding from the enclosing render is exactly the shape the
   * React Compiler refuses to memoise, and it is not a false positive — a
   * `map` callback is free to run later than the render that created it, and
   * this one would then keep adding to an offset from a render that is over.
   */
  const arcs = [];
  let offset = 0;
  for (const seg of segments) {
    const length = Math.max(0, seg.share * circumference - gap);
    arcs.push({
      key: seg.key,
      /** The track — always drawn, so the shape of the session is visible. */
      trackDash: `${length} ${circumference - length}`,
      trackOffset: -offset,
      /** The fill — how much of this segment has elapsed. */
      fillDash: `${length * seg.fill} ${circumference - length * seg.fill}`,
      fillOffset: -offset,
      active: seg.active,
      completed: seg.completed,
    });
    offset += seg.share * circumference;
  }

  const timeColor = overrunning
    ? theme.warning.text
    : paused
      ? theme.text.tertiary
      : theme.text.primary;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={
        `Phase ${phaseIndex} of 5, ${phaseTitle}. ` +
        (paused
          ? "Paused."
          : overrunning
            ? `${formatClock(remainingSeconds)} over time.`
            : `${formatClock(remainingSeconds)} remaining.`)
      }
      accessibilityValue={{ now: phaseIndex, min: 1, max: 5 }}
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        {/* Rotated so the ring starts at twelve o'clock rather than at three. */}
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {arcs.map((a) => (
            <Circle
              key={`track-${a.key}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.surface.sunken}
              strokeWidth={stroke}
              strokeDasharray={a.trackDash}
              strokeDashoffset={a.trackOffset}
              strokeLinecap="butt"
              fill="none"
            />
          ))}
          {arcs.map((a) => (
            <Circle
              key={`fill-${a.key}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={
                a.completed
                  ? palette.moss[400]
                  : a.active
                    ? overrunning
                      ? palette.apricot[500]
                      : palette.moss[600]
                    : "transparent"
              }
              strokeWidth={stroke}
              strokeDasharray={a.fillDash}
              strokeDashoffset={a.fillOffset}
              strokeLinecap="butt"
              fill="none"
              // The active arc is very slightly translucent while running, so
              // it reads as "in progress" against the solid completed ones —
              // a static distinction, so it survives reduced motion.
              opacity={a.active && !reduceMotion && !paused ? 0.92 : 1}
            />
          ))}
        </G>
      </Svg>

      <VStack gap={2} align="center">
        <Text variant="overline" tone="tertiary">
          {paused ? "PAUSED" : `PHASE ${phaseIndex} OF 5`}
        </Text>
        <Text
          variant="display-lg"
          numeric
          style={{ color: timeColor, fontSize: size * 0.19 }}
          // Uncapped OS scaling would overflow a fixed circle; the numeral is
          // already large and the label beneath carries the meaning.
          maxFontSizeMultiplier={1.2}
        >
          {formatClock(remainingSeconds)}
        </Text>
        <Text variant="label" tone={overrunning ? "warning" : "secondary"}>
          {overrunning ? "over time" : phaseTitle}
        </Text>
      </VStack>
    </View>
  );
}
