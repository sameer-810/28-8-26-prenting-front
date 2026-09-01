import React from "react";
import { View } from "react-native";
import { ArrowRight, TrendingUp, Minus } from "lucide-react-native";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { Text, Card, VStack, HStack } from "@shared/ui";
import type { ProofOfProgress } from "../api/progressApi";

/**
 * The PRD's Proof of Progress — "3 months ago: Building Foundations (40% speed)
 * → today: Fluent & Confident (95% accuracy)".
 *
 * Two rules keep it honest:
 *
 *   · A child who got WORSE is shown as such, in words. A card that can only
 *     report improvement is marketing, and a parent who senses that stops
 *     believing the good numbers too.
 *   · An unrated "before" is said out loud, never rendered as zero.
 */
export function ProofOfProgressCard({ data }: { data: ProofOfProgress }) {
  const theme = useTheme();
  const { before, after, comparison } = data;

  const improved = comparison.improved;
  const flat = comparison.scoreDelta === 0;

  const tone = flat
    ? theme.text.tertiary
    : improved
      ? theme.success.text
      : theme.warning.text;

  return (
    <Card>
      <VStack gap={16}>
        <HStack gap={8}>
          {flat ? (
            <Minus size={16} color={tone} />
          ) : (
            <TrendingUp
              size={16}
              color={tone}
              // Rotated for a decline rather than swapping to a "down" icon:
              // the same mark reading the other way is calmer than a red arrow.
              style={improved ? undefined : { transform: [{ scaleY: -1 }] }}
            />
          )}
          <Text variant="label" style={{ color: tone }}>
            {flat
              ? "About the same as before"
              : improved
                ? "Moving forward"
                : "Slipped a little"}
          </Text>
        </HStack>

        <HStack gap={12} align="center">
          <Half
            caption={`${data.windowDays} days before`}
            label={before.rated ? before.label : "No rating yet"}
            score={before.rated ? before.score : null}
            muted
          />
          <ArrowRight size={18} color={theme.text.disabled} />
          <Half
            caption="Now"
            label={after.rated ? after.label : "No rating yet"}
            score={after.rated ? after.score : null}
          />
        </HStack>

        {/**
         * The sentence, in the PRD's own register. Assembled from what is
         * actually true rather than from a template with blanks — a child who
         * gained no band should not be told they did.
         */}
        <View
          style={{
            padding: 12,
            borderRadius: radius.md,
            backgroundColor: theme.surface.sunken,
          }}
        >
          <Text variant="body-sm" tone="secondary">
            {sentenceFor(data)}
          </Text>
        </View>
      </VStack>
    </Card>
  );
}

function Half({
  caption,
  label,
  score,
  muted,
}: {
  caption: string;
  label: string;
  score: number | null;
  muted?: boolean;
}) {
  return (
    <VStack gap={3} flex={1}>
      <Text variant="caption" tone="disabled">
        {caption}
      </Text>
      <Text variant="label-lg" tone={muted ? "tertiary" : "accent"}>
        {label}
      </Text>
      {score !== null ? (
        <Text
          variant="display-sm"
          numeric
          tone={muted ? "tertiary" : "primary"}
        >
          {score}
        </Text>
      ) : (
        <Text variant="body-sm" tone="disabled">
          —
        </Text>
      )}
    </VStack>
  );
}

function sentenceFor(data: ProofOfProgress): string {
  const { before, after, comparison } = data;
  const acc = Math.round(after.components.accuracy * 100);

  if (!before.rated && after.rated) {
    return `There wasn't enough history to rate ${data.windowDays} days ago. Now there is — ${after.label.toLowerCase()}, at ${acc}% accuracy.`;
  }
  if (!after.rated) {
    return `Not enough sessions recently for a rating. A few more and this will fill in.`;
  }
  if (comparison.bandsGained > 0) {
    return `Up ${comparison.bandsGained} band${comparison.bandsGained === 1 ? "" : "s"} — from ${before.label} to ${after.label}, now at ${acc}% accuracy.`;
  }
  if (comparison.scoreDelta > 0) {
    return `Still ${after.label}, but ${comparison.scoreDelta} points stronger within it — ${acc}% accuracy now.`;
  }
  if (comparison.scoreDelta < 0) {
    /**
     * Explicitly not a scolding. The most likely cause of a decline is fewer
     * sessions, and naming that gives the parent something to act on rather
     * than something to worry about.
     */
    return `Down ${Math.abs(comparison.scoreDelta)} points. Often that's simply fewer sessions in the period rather than anything going wrong.`;
  }
  return `Holding steady at ${after.label}, ${acc}% accuracy.`;
}
