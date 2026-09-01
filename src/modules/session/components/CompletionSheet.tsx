import React from "react";
import { View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Sparkles,
  Flame,
  TrendingUp,
  Star,
  CloudOff,
} from "lucide-react-native";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import {
  Text,
  Button,
  Card,
  VStack,
  HStack,
  StatTile,
  StatRow,
} from "@shared/ui";
import { FluencyMeter } from "@shared/ui/FluencyMeter";
import type { StudyPlan, CompletionResult } from "../api/sessionApi";

/**
 * The end of the session. The one place Fraunces, apricot and a celebration
 * appear together, and the loudest thing in the app — everywhere else is
 * restrained so this can land.
 *
 * Works offline: `result` is null when completion went to the outbox instead,
 * and the sheet falls back to the device's own score. The streak and band
 * arrive when the queue drains.
 */
export function CompletionSheet({
  plan,
  result,
  localScore,
  minutes,
  onDone,
}: {
  plan: StudyPlan;
  result: CompletionResult | null;
  localScore: { attempted: number; correct: number; accuracy: number };
  minutes: number;
  onDone: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const score = result?.session?.score ?? {
    attempted: localScore.attempted,
    correct: localScore.correct,
    accuracy: localScore.accuracy,
  };
  const perfect = score.attempted > 0 && score.correct === score.attempted;
  const streak = result?.streak;
  const fluency = result?.fluency;
  const milestones = result?.milestones ?? [];

  return (
    <View
      accessibilityViewIsModal
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: theme.surface.secondary,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 22,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 28,
        }}
      >
        <View style={{ width: "100%", maxWidth: 520, alignSelf: "center" }}>
          <VStack gap={18}>
            <VStack gap={10} align="center">
              <View
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: radius.full,
                  backgroundColor: perfect
                    ? theme.accents.apricot.tint
                    : theme.accents.moss.tint,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {perfect ? (
                  <Star size={30} color={theme.accents.apricot.color} />
                ) : (
                  <Sparkles size={30} color={theme.accents.moss.color} />
                )}
              </View>

              <Text variant="display-md" align="center">
                {perfect ? "Every answer right" : "Session complete"}
              </Text>
              <Text variant="body" tone="tertiary" align="center">
                {plan.topic.title}
              </Text>
            </VStack>

            <Card>
              <StatRow>
                <StatTile value={`${minutes}m`} label="Studied" />
                <StatTile
                  value={`${score.correct}/${score.attempted}`}
                  label="Correct"
                  accent={perfect ? "apricot" : undefined}
                />
                <StatTile
                  value={`${Math.round((score.accuracy ?? 0) * 100)}%`}
                  label="Accuracy"
                />
              </StatRow>
            </Card>

            {streak ? (
              <Card tone={streak.isNewRecord ? "accent" : "default"}>
                <HStack gap={12}>
                  <Flame
                    size={22}
                    color={theme.accents.apricot.color}
                    fill={theme.accents.apricot.color}
                  />
                  <VStack gap={2} flex={1}>
                    <Text variant="label-lg">
                      {streak.current} day{streak.current === 1 ? "" : "s"} in a
                      row
                    </Text>
                    <Text variant="caption" tone="tertiary">
                      {streak.isNewRecord
                        ? "That's a new personal best."
                        : `Best so far: ${streak.longest} days`}
                    </Text>
                  </VStack>
                </HStack>
              </Card>
            ) : null}

            {fluency?.rated ? (
              <Card>
                <VStack gap={10}>
                  <HStack gap={8}>
                    <TrendingUp size={16} color={theme.text.accent} />
                    <Text variant="label" tone="secondary">
                      Where they are now
                    </Text>
                  </HStack>
                  <FluencyMeter {...fluency} sessionsToRate={0} />
                </VStack>
              </Card>
            ) : null}

            {/**
             * Badges beyond the streak — a perfect session, a topic mastered, a
             * band moved. Filtered to the ones that are not already spelled out
             * above, so the sheet does not say the same thing three times.
             */}
            {milestones.filter(
              (m) => m.kind !== "daily_card" && m.kind !== "streak",
            ).length > 0 ? (
              <VStack gap={8}>
                {milestones
                  .filter((m) => m.kind !== "daily_card" && m.kind !== "streak")
                  .map((m) => (
                    <Card key={m.id} tone="sunken" padding="compact">
                      <VStack gap={2}>
                        <Text variant="label">{m.title}</Text>
                        {m.body ? (
                          <Text variant="caption" tone="tertiary">
                            {m.body}
                          </Text>
                        ) : null}
                      </VStack>
                    </Card>
                  ))}
              </VStack>
            ) : null}

            {/**
             * Offline is stated plainly rather than hidden. A parent who sees
             * no streak tonight should know it is coming, not conclude the
             * session did not count.
             */}
            {!result ? (
              <Card tone="sunken" padding="compact">
                <HStack gap={10}>
                  <CloudOff size={16} color={theme.text.tertiary} />
                  <Text variant="body-sm" tone="tertiary" style={{ flex: 1 }}>
                    You're offline — this session is saved and your streak will
                    update as soon as you're back.
                  </Text>
                </HStack>
              </Card>
            ) : null}

            <Button label="Done" onPress={onDone} size="lg" />
          </VStack>
        </View>
      </ScrollView>
    </View>
  );
}
