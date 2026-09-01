import React, { useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users, Flame, Sparkles, Languages } from "lucide-react-native";
import { apiErrorMessage } from "@api/apiClient";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { useAuthStore } from "@shared/store/useAuthStore";
import { useAppNavigation } from "@navigation/types";
import {
  Screen,
  Text,
  Button,
  Card,
  Chip,
  VStack,
  HStack,
  StatTile,
  StatRow,
  EmptyState,
  ErrorState,
  Skeleton,
  Banner,
} from "@shared/ui";
import { useChildren } from "@modules/auth/hooks/useAuth";
import { progressApi } from "@modules/progress/api/progressApi";

/**
 * The children in the household, and their recent milestones.
 *
 * Doubles as the celebration feed. Milestones are stored records of things that
 * HAPPENED — so this list survives the underlying data changing, which is why
 * a "7-day streak" card a family already saw does not vanish if a session is
 * later corrected.
 */
export default function ChildrenScreen() {
  const theme = useTheme();
  const navigation = useAppNavigation();
  const family = useAuthStore((s) => s.family);
  const {
    data: children,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useChildren();
  const [seenCleared, setSeenCleared] = useState(false);

  const { data: milestones } = useQuery({
    queryKey: ["milestones"],
    queryFn: () => progressApi.milestones({ limit: 30 }),
  });

  const capacity = family?.limits?.maxChildren ?? 1;
  const atCapacity = (children?.length ?? 0) >= capacity;

  if (isLoading) {
    return (
      <Screen title="Children">
        <VStack gap={14}>
          <Skeleton height={130} />
          <Skeleton height={130} />
        </VStack>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="Children">
        <ErrorState
          message={apiErrorMessage(error)}
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  if (!children?.length) {
    return (
      <Screen title="Children">
        <EmptyState
          icon={<Users size={28} color={theme.text.tertiary} />}
          title="No children yet"
          body="Add your first child and we can build tonight's session."
          actionLabel="Add a child"
          onAction={() => navigation.navigate("AddChild")}
        />
      </Screen>
    );
  }

  const unseen = (milestones ?? []).filter((m) => !m.seen);

  return (
    <Screen
      title="Children"
      subtitle={`${children.length} of ${capacity} on your ${family?.subscription?.planName ?? "plan"}`}
      refreshing={isRefetching}
      onRefresh={() => refetch()}
      right={
        <Button
          label="Add child"
          variant="secondary"
          size="sm"
          fullWidth={false}
          icon={<Plus size={16} color={theme.text.primary} />}
          onPress={() => navigation.navigate("AddChild")}
          disabled={atCapacity}
        />
      }
    >
      <VStack gap={16}>
        {/**
         * The plan ceiling is surfaced BEFORE a parent taps Add and loses a
         * form to a 403. The API enforces it either way; this is about not
         * wasting their time.
         */}
        {atCapacity ? (
          <Banner
            tone="info"
            title={`Your plan covers ${capacity} ${capacity === 1 ? "child" : "children"}`}
            body="Upgrade from Settings to add another."
          />
        ) : null}

        {children.map((child) => (
          <Card key={child.id}>
            <VStack gap={14}>
              <HStack gap={12}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.full,
                    backgroundColor: theme.accents.moss.tint,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text variant="h3" tone="accent">
                    {child.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <VStack gap={3} flex={1}>
                  <Text variant="h2">{child.name}</Text>
                  <Text variant="caption" tone="tertiary">
                    Grade {child.grade} · {child.boardName}
                    {child.schoolName ? ` · ${child.schoolName}` : ""}
                  </Text>
                </VStack>
              </HStack>

              {/**
               * The two languages, shown as a pair. For the PRD's second
               * persona this IS the product, and seeing it stated on the child's
               * own card is how a parent confirms we understood their setup.
               */}
              {child.languages.isDualLanguage ? (
                <HStack gap={8}>
                  <Languages size={14} color={theme.text.tertiary} />
                  <Text variant="caption" tone="tertiary">
                    You teach in {child.languages.parent.label} · they answer in{" "}
                    {child.languages.child.label}
                  </Text>
                </HStack>
              ) : null}

              <StatRow>
                <StatTile value={child.totals.sessions} label="Sessions" />
                <StatTile
                  value={`${Math.round(child.totals.minutesStudied / 60)}h`}
                  label="Studied"
                />
                <StatTile
                  value={child.streak.current}
                  label="Streak"
                  accent={child.streak.current > 0 ? "apricot" : undefined}
                  hint="days"
                />
              </StatRow>

              <HStack justify="space-between">
                <Chip
                  label={child.fluency.label}
                  tone={child.fluency.band === "unrated" ? "neutral" : "moss"}
                />
                <Button
                  label="Plan a session"
                  size="sm"
                  fullWidth={false}
                  icon={<Sparkles size={14} color="#FFFFFF" />}
                  onPress={() =>
                    navigation.navigate("Capture", { childId: child.id })
                  }
                />
              </HStack>
            </VStack>
          </Card>
        ))}

        {milestones?.length ? (
          <Card>
            <VStack gap={14}>
              <HStack justify="space-between">
                <Text variant="h3">Recent wins</Text>
                {unseen.length > 0 && !seenCleared ? (
                  <Button
                    label="Mark all seen"
                    variant="ghost"
                    size="sm"
                    fullWidth={false}
                    onPress={async () => {
                      await progressApi.markMilestonesSeen();
                      setSeenCleared(true);
                    }}
                  />
                ) : null}
              </HStack>

              {milestones.slice(0, 12).map((m) => {
                const child = children.find((c) => c.id === m.childId);
                return (
                  <HStack key={m.id} gap={10} align="flex-start">
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: radius.full,
                        backgroundColor:
                          m.kind === "streak" || m.kind === "streak_record"
                            ? theme.accents.apricot.tint
                            : theme.accents.moss.tint,
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 1,
                      }}
                    >
                      {m.kind === "streak" || m.kind === "streak_record" ? (
                        <Flame size={13} color={theme.accents.apricot.color} />
                      ) : (
                        <Sparkles size={13} color={theme.accents.moss.color} />
                      )}
                    </View>
                    <VStack gap={2} flex={1}>
                      <Text variant="label">{m.title}</Text>
                      <Text variant="caption" tone="tertiary">
                        {child ? `${child.name} · ` : ""}
                        {m.dayKey}
                        {m.body ? ` · ${m.body}` : ""}
                      </Text>
                    </VStack>
                  </HStack>
                );
              })}
            </VStack>
          </Card>
        ) : null}
      </VStack>
    </Screen>
  );
}
