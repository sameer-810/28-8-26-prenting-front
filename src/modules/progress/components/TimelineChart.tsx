import React, { useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { radius, palette } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { Text } from "@shared/ui/Text";
import { VStack, HStack } from "@shared/ui/Stack";
import { useBreakpoint } from "@shared/ui/useBreakpoint";

export interface DayPoint {
  dayKey: string;
  sessions: number;
  attempted: number;
  correct: number;
  accuracy: number;
  minutesStudied: number;
  adherence: number;
}

type Metric = "minutesStudied" | "accuracy" | "sessions";

const METRICS: { key: Metric; label: string; format: (v: number) => string }[] = [
  { key: "minutesStudied", label: "Minutes", format: (v) => `${Math.round(v)}m` },
  { key: "accuracy", label: "Accuracy", format: (v) => `${Math.round(v * 100)}%` },
  { key: "sessions", label: "Sessions", format: (v) => String(v) },
];

/**
 * The day-by-day chart.
 *
 * TWO THINGS THAT ARE NOT DECORATION
 *
 * 1. Empty days are DRAWN, as empty. The series arrives dense from the API for
 *    exactly this reason — a chart plotted only from days that exist compresses
 *    a fortnight's gap into a neighbouring bar and makes a lapsed month look
 *    continuous, which is the opposite of what a progress view is for.
 *
 * 2. It is readable without seeing it. Every bar carries its own accessibility
 *    label, and the summary line above states the same facts in words. A chart
 *    that is the only route to the information excludes the parent using a
 *    screen reader from their own child's progress.
 *
 * Deliberately plain `View`s rather than SVG: bars are rectangles, and this
 * avoids a second rendering path to keep consistent with the theme.
 */
export function TimelineChart({
  series,
  windowDays,
}: {
  series: DayPoint[];
  windowDays: number;
}) {
  const theme = useTheme();
  const { isWide } = useBreakpoint();
  const [metric, setMetric] = useState<Metric>("minutesStudied");
  const [selected, setSelected] = useState<string | null>(null);

  const active = METRICS.find((m) => m.key === metric)!;
  const values = series.map((d) => d[metric] as number);
  const max = Math.max(...values, metric === "accuracy" ? 1 : 1);

  /**
   * A year of daily bars is 365 slivers nobody can read or tap. Past a
   * threshold the days are folded into weeks — the shape of the year is the
   * question being asked at that range, not any individual Tuesday.
   */
  const grouped = windowDays > 70 ? groupByWeek(series, metric) : null;
  const points = grouped ?? series;
  const groupedMax = grouped ? Math.max(...grouped.map((g) => g[metric] as number), 1) : max;
  const scaleMax = grouped ? groupedMax : max;

  const barWidth = isWide ? 14 : 9;
  const gap = isWide ? 5 : 3;
  const height = 132;

  const activeDays = series.filter((d) => d.sessions > 0).length;
  const totalMinutes = series.reduce((s, d) => s + d.minutesStudied, 0);

  const point = selected ? series.find((d) => d.dayKey === selected) : null;

  return (
    <VStack gap={12}>
      <HStack justify="space-between" wrap gap={8}>
        <HStack gap={6}>
          {METRICS.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => setMetric(m.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: metric === m.key }}
              // RN Web does not map accessibilityState onto a Pressable — see
              // shared/ui/Toggle.tsx. A tab that never announces which one is
              // selected leaves a screen-reader user unable to tell which
              // metric the chart is showing.
              aria-selected={metric === m.key}
              accessibilityLabel={`Show ${m.label}`}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: radius.full,
                backgroundColor:
                  metric === m.key ? theme.accents.moss.tint : "transparent",
              }}
            >
              <Text
                variant="label-sm"
                tone={metric === m.key ? "accent" : "tertiary"}
              >
                {m.label}
              </Text>
            </Pressable>
          ))}
        </HStack>

        {grouped ? (
          <Text variant="caption" tone="disabled">
            by week
          </Text>
        ) : null}
      </HStack>

      {/**
       * The same facts, in a sentence. This is what a screen reader reads, and
       * it is genuinely useful sighted too — most parents want the summary, not
       * to read individual bars.
       */}
      <Text variant="body-sm" tone="tertiary">
        {activeDays === 0
          ? "No sessions in this period yet."
          : `${activeDays} day${activeDays === 1 ? "" : "s"} studied out of ${windowDays}, ${Math.round(totalMinutes / 60)} hours in total.`}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // The most recent days matter most, so a long range opens at the end.
        contentContainerStyle={{ flexDirection: "row-reverse", gap, paddingVertical: 4 }}
      >
        {[...points].reverse().map((d) => {
          const value = d[metric] as number;
          const ratio = scaleMax > 0 ? value / scaleMax : 0;
          const isSelected = selected === d.dayKey;
          const empty = d.sessions === 0;

          return (
            <Pressable
              key={d.dayKey}
              onPress={() => setSelected(isSelected ? null : d.dayKey)}
              accessibilityRole="button"
              accessibilityLabel={
                empty
                  ? `${formatDay(d.dayKey)}: no session`
                  : `${formatDay(d.dayKey)}: ${active.format(value)}, ${d.sessions} session${d.sessions === 1 ? "" : "s"}`
              }
              style={{ alignItems: "center", justifyContent: "flex-end", height }}
            >
              <View
                style={{
                  width: barWidth,
                  // A visible stub for an empty day: a zero-height bar is
                  // indistinguishable from a day that is not there at all.
                  height: Math.max(empty ? 3 : 6, ratio * (height - 16)),
                  borderRadius: radius.xs,
                  backgroundColor: empty
                    ? theme.border.default
                    : isSelected
                      ? palette.moss[700]
                      : palette.moss[500],
                }}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      {point ? (
        <View
          style={{
            padding: 12,
            borderRadius: radius.md,
            backgroundColor: theme.surface.sunken,
          }}
        >
          <VStack gap={3}>
            <Text variant="label">{formatDay(point.dayKey)}</Text>
            {point.sessions === 0 ? (
              <Text variant="body-sm" tone="tertiary">
                No session that day.
              </Text>
            ) : (
              <Text variant="body-sm" tone="tertiary">
                {point.sessions} session{point.sessions === 1 ? "" : "s"} ·{" "}
                {point.minutesStudied} minutes · {point.correct}/{point.attempted} correct
              </Text>
            )}
          </VStack>
        </View>
      ) : (
        <Text variant="caption" tone="disabled">
          Tap a bar for that day.
        </Text>
      )}
    </VStack>
  );
}

/** Folds days into weeks for long ranges, summing or averaging as appropriate. */
function groupByWeek(series: DayPoint[], metric: Metric): DayPoint[] {
  const weeks: DayPoint[] = [];
  for (let i = 0; i < series.length; i += 7) {
    const chunk = series.slice(i, i + 7);
    const attempted = chunk.reduce((s, d) => s + d.attempted, 0);
    const correct = chunk.reduce((s, d) => s + d.correct, 0);
    weeks.push({
      dayKey: chunk[0].dayKey,
      sessions: chunk.reduce((s, d) => s + d.sessions, 0),
      attempted,
      correct,
      // Accuracy is a RATIO, so it is recomputed from the totals rather than
      // averaged — averaging seven daily percentages weights a one-question
      // Tuesday the same as an eight-question Saturday.
      accuracy: attempted > 0 ? correct / attempted : 0,
      minutesStudied: chunk.reduce((s, d) => s + d.minutesStudied, 0),
      adherence:
        chunk.filter((d) => d.sessions > 0).reduce((s, d) => s + d.adherence, 0) /
        Math.max(1, chunk.filter((d) => d.sessions > 0).length),
    });
  }
  return weeks;
}

function formatDay(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
