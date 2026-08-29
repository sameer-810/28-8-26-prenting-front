import React from "react";
import { View, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Plus, Sparkles, Clock, ChevronRight } from "lucide-react-native";
import { apiErrorMessage } from "@api/apiClient";
import { useAppNavigation } from "@navigation/types";
import { useAuthStore } from "@shared/store/useAuthStore";
import { useOfflineStore } from "@shared/offline/useOfflineStore";
import { useTheme } from "@shared/useTheme";
import { radius } from "@shared/designSystem";
import {
  Screen,
  Text,
  Button,
  Card,
  VStack,
  HStack,
  StatTile,
  StatRow,
  FluencyMeter,
  EmptyState,
  ErrorState,
  Skeleton,
  Chip,
} from "@shared/ui";
import { StreakBadge } from "@shared/ui/StreakBadge";
import { dashboardApi, type ChildCard } from "../api/dashboardApi";

/**
 * The home screen.
 *
 * One aggregate request, because this is the first thing a parent sees, on a
 * phone, often on a weak connection, at the end of a working day. Six parallel
 * requests would be six chances to be slow and six spinners.
 */
export default function HomeScreen() {
  const navigation = useAppNavigation();
  const user = useAuthStore((s) => s.user);
  const isOnline = useOfflineStore((s) => s.isOnline);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
  });

  const greeting = timeGreeting();

  if (isLoading) {
    return (
      <Screen title={`${greeting}, ${user?.firstName ?? ""}`}>
        <VStack gap={14}>
          <Skeleton height={130} />
          <Skeleton height={130} />
        </VStack>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title={`${greeting}, ${user?.firstName ?? ""}`}>
        <ErrorState
          offline={!isOnline}
          message={isOnline ? apiErrorMessage(error) : undefined}
          onRetry={() => refetch()}
        />
      </Screen>
    );
  }

  if (data?.isEmpty) {
    return (
      <Screen title={`${greeting}, ${user?.firstName ?? ""}`}>
        <EmptyState
          icon={<Sparkles size={30} color="#4A7740" />}
          title="Let's add your child"
          body="Two details — their name and their grade — and we can build tonight's session."
          actionLabel="Add your child"
          onAction={() => navigation.navigate("AddChild")}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title={`${greeting}, ${user?.firstName ?? ""}`}
      subtitle={subtitleFor(data)}
      refreshing={isRefetching}
      onRefresh={() => refetch()}
      right={
        <Button
          label="Add child"
          variant="secondary"
          size="sm"
          fullWidth={false}
          icon={<Plus size={16} color="#3B372F" />}
          onPress={() => navigation.navigate("AddChild")}
        />
      }
    >
      <VStack gap={16}>
        {data?.children.map((child) => (
          <ChildCardView key={child.id} child={child} />
        ))}
      </VStack>
    </Screen>
  );
}

function ChildCardView({ child }: { child: ChildCard }) {
  const navigation = useAppNavigation();
  const theme = useTheme();

  return (
    <Card padding="none">
      <VStack>
        {/* Header: who, and whether tonight has happened yet. */}
        <HStack gap={12} style={{ padding: 18, paddingBottom: 14 }}>
          <View
            style={{
              width: 46,
              height: 46,
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
            <HStack gap={8}>
              <Text variant="caption" tone="tertiary">
                Grade {child.grade}
              </Text>
              <StreakBadge
                days={child.streak.current}
                graceRemaining={child.streak.graceRemaining}
                showGrace={false}
              />
            </HStack>
          </VStack>

          {child.studiedToday ? (
            <Chip label="Done today" tone="success" />
          ) : null}
        </HStack>

        {/**
         * The daily milestone card, when tonight has produced one. It names
         * what the child actually did — "Mastered Fraction Addition today" is
         * a reason to come back tomorrow; "Session complete" is a receipt.
         */}
        {child.dailyCard ? (
          <View
            style={{
              marginHorizontal: 18,
              marginBottom: 14,
              padding: 14,
              borderRadius: radius.md,
              backgroundColor: theme.accents.apricot.tint,
            }}
          >
            <HStack gap={8}>
              <Sparkles size={16} color={theme.accents.apricot.color} />
              <VStack gap={2} flex={1}>
                <Text variant="label" style={{ color: theme.accents.apricot.color }}>
                  {child.dailyCard.title}
                </Text>
                {child.dailyCard.body ? (
                  <Text variant="caption" tone="tertiary">
                    {child.dailyCard.body}
                  </Text>
                ) : null}
              </VStack>
            </HStack>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 18 }}>
          <StatRow>
            <StatTile value={child.last30Days.sessions} label="Sessions" hint="30 days" />
            <StatTile
              value={`${Math.round(child.last30Days.minutesStudied / 60)}h`}
              label="Studied"
              hint="30 days"
            />
            <StatTile value={child.streak.longest} label="Best streak" hint="days" />
          </StatRow>
        </View>

        <View style={{ padding: 18, paddingTop: 16 }}>
          <FluencyMeter {...child.fluency} compact />
        </View>

        <View style={{ height: 1, backgroundColor: theme.border.subtle }} />

        {/**
         * The primary action changes with what is actually true: resume an
         * open session, run a plan that is already ready, or start fresh.
         * Offering "Start a session" to someone with one half-finished is how
         * a product loses a family's evening.
         */}
        <View style={{ padding: 18 }}>
          {child.resumable ? (
            <Button
              label="Resume session"
              icon={<Clock size={16} color="#FFFFFF" />}
              onPress={() =>
                navigation.navigate("Session", { sessionId: child.resumable!.sessionId })
              }
            />
          ) : (
            <Button
              label="Plan tonight's session"
              icon={<Sparkles size={16} color="#FFFFFF" />}
              onPress={() =>
                navigation.navigate("Capture", { childId: child.id })
              }
            />
          )}

          {child.readyPlans.length > 0 && !child.resumable ? (
            <VStack gap={8} style={{ marginTop: 14 }}>
              <Text variant="label-sm" tone="tertiary">
                READY TO RUN
              </Text>
              {child.readyPlans.slice(0, 2).map((plan) => (
                <Pressable
                  key={plan.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Run ${plan.title}`}
                  onPress={() =>
                    navigation.navigate("Plan", { planId: plan.id })
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 8,
                  }}
                >
                  <Text variant="body-sm" tone="secondary" style={{ flex: 1 }} numberOfLines={1}>
                    {plan.title}
                  </Text>
                  <ChevronRight size={16} color={theme.text.disabled} />
                </Pressable>
              ))}
            </VStack>
          ) : null}
        </View>
      </VStack>
    </Card>
  );
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The subtitle is the nudge, and it is honest about the state.
 *
 * Inside the study window with nobody done yet, it says so. Outside it, it does
 * not pretend it is study time — a product that tells a parent to start a
 * 30-minute session at 11pm has stopped paying attention to them.
 */
function subtitleFor(data?: { inStudyWindow: boolean; children: ChildCard[]; usage: { sessionsLeft: number } }) {
  if (!data) return undefined;
  const pending = data.children.filter((c) => !c.studiedToday);
  if (pending.length === 0) return "Everyone's done for today. Nicely handled.";
  if (data.inStudyWindow) {
    return pending.length === 1
      ? `${pending[0].name} hasn't studied yet tonight.`
      : `${pending.length} sessions still to do tonight.`;
  }
  return "Outside your usual study time — plan ahead if you like.";
}
