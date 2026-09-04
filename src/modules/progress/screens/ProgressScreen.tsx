import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { Lock, Target } from "lucide-react-native";
import { apiErrorCode, apiErrorMessage } from "@api/apiClient";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { useAuthStore } from "@shared/store/useAuthStore";
import {
  Screen,
  Text,
  Card,
  Chip,
  ChipRow,
  VStack,
  HStack,
  StatTile,
  StatRow,
  FluencyMeter,
  EmptyState,
  ErrorState,
  Skeleton,
  Select,
} from "@shared/ui";
import { StreakBadge } from "@shared/ui/StreakBadge";
import { useChildren } from "@modules/auth/hooks/useAuth";
import type { Timeline } from "../types";
import {
  useTimeline,
  useStreak,
  useProofOfProgress,
  useSubjects,
  useMastery,
} from "../hooks/useProgress";
import { TimelineChart } from "../components/TimelineChart";
import { ProofOfProgressCard } from "../components/ProofOfProgressCard";
import { ReportsCard } from "../components/ReportsCard";

const TIMELINES: { key: Timeline; label: string }[] = [
  { key: "daily", label: "Today" },
  { key: "weekly", label: "This week" },
  { key: "monthly", label: "This month" },
  { key: "yearly", label: "This year" },
];

/**
 * The progress screen — every timeline the PRD names, for one child at a time.
 *
 * Per child rather than per household on purpose: "how is my family doing" is
 * not a question a parent asks, and averaging two children's accuracy produces
 * a number that describes neither of them.
 */
export default function ProgressScreen() {
  const theme = useTheme();
  const family = useAuthStore((s) => s.family);
  const { data: children, isLoading: childrenLoading } = useChildren();

  const [childId, setChildId] = useState<string>("");
  const [timeline, setTimeline] = useState<Timeline>("monthly");

  const child = useMemo(
    () => children?.find((c) => c.id === childId) ?? children?.[0],
    [children, childId],
  );

  const allowed = family?.limits?.timelines ?? ["daily", "weekly"];

  const { data, isLoading, error, refetch, isRefetching } = useTimeline(
    child?.id,
    timeline,
  );
  const { data: streak } = useStreak(child?.id);

  /**
   * Proof of Progress is only fetched on ranges where a period-over-period
   * comparison means something, and only on plans that include the custom
   * timeline — see the hook.
   */
  const wantsComparison = timeline === "monthly" || timeline === "yearly";

  const { data: proof } = useProofOfProgress(
    child?.id,
    timeline,
    data,
    wantsComparison && allowed.includes("custom"),
  );
  const { data: subjects } = useSubjects(child?.id, data);
  const { data: mastery } = useMastery(child?.id, data);

  if (childrenLoading) {
    return (
      <Screen title="Progress">
        <VStack gap={14}>
          <Skeleton height={120} />
          <Skeleton height={200} />
        </VStack>
      </Screen>
    );
  }

  if (!children?.length) {
    return (
      <Screen title="Progress">
        <EmptyState
          icon={<Target size={28} color={theme.text.tertiary} />}
          title="No children yet"
          body="Add a child and their progress will start building from their first session."
        />
      </Screen>
    );
  }

  /**
   * A plan refusal is NOT an error state. The API returns a structured
   * PLAN_LIMIT, and rendering it as "something went wrong" would tell a parent
   * the app is broken when it is working exactly as sold.
   */
  const planLocked = error && apiErrorCode(error) === "PLAN_LIMIT";

  return (
    <Screen
      title="Progress"
      subtitle={child ? `${child.name}, Grade ${child.grade}` : undefined}
      refreshing={isRefetching}
      onRefresh={() => refetch()}
    >
      <VStack gap={18}>
        {children.length > 1 ? (
          <Select
            label="Child"
            value={child?.id}
            options={children.map((c) => ({
              value: c.id,
              label: c.name,
              hint: `Grade ${c.grade}`,
            }))}
            onChange={setChildId}
          />
        ) : null}

        <ChipRow>
          {TIMELINES.map((t) => {
            const locked = !allowed.includes(t.key);
            return (
              <Chip
                key={t.key}
                label={t.label}
                selected={timeline === t.key}
                onPress={() => setTimeline(t.key)}
                icon={
                  locked ? (
                    <Lock size={11} color={theme.text.disabled} />
                  ) : undefined
                }
              />
            );
          })}
        </ChipRow>

        {planLocked ? (
          <Card tone="warning">
            <VStack gap={12}>
              <HStack gap={10}>
                <Lock size={18} color={theme.warning.text} />
                <VStack gap={3} flex={1}>
                  <Text variant="label" style={{ color: theme.warning.text }}>
                    Part of the Family Annual plan
                  </Text>
                  <Text variant="body-sm" style={{ color: theme.warning.text }}>
                    {apiErrorMessage(error)}
                  </Text>
                </VStack>
              </HStack>
              <Text variant="caption" tone="tertiary">
                Today and this week stay available on every plan.
              </Text>
            </VStack>
          </Card>
        ) : error ? (
          <ErrorState
            message={apiErrorMessage(error)}
            onRetry={() => refetch()}
          />
        ) : isLoading || !data ? (
          <VStack gap={14}>
            <Skeleton height={110} />
            <Skeleton height={190} />
          </VStack>
        ) : data.totals.completedSessions === 0 ? (
          <EmptyState
            icon={<Target size={28} color={theme.text.tertiary} />}
            title="Nothing here yet"
            body={`No sessions for ${child?.name} in this period. Run one tonight and it'll show up here.`}
          />
        ) : (
          <>
            <Card>
              <VStack gap={16}>
                <StatRow>
                  <StatTile
                    value={data.totals.completedSessions}
                    label="Sessions"
                  />
                  <StatTile
                    value={`${data.totals.hoursStudied}h`}
                    label="Studied"
                  />
                  <StatTile
                    value={`${Math.round(data.totals.accuracy * 100)}%`}
                    label="Accuracy"
                  />
                  <StatTile
                    value={data.totals.topicsMastered}
                    label="Mastered"
                  />
                </StatRow>

                {streak ? (
                  <StreakBadge
                    days={streak.current}
                    graceRemaining={streak.graceRemaining}
                  />
                ) : null}
              </VStack>
            </Card>

            <Card>
              <VStack gap={14}>
                <Text variant="h3">Day by day</Text>
                <TimelineChart
                  series={data.series}
                  windowDays={data.windowDays}
                />
              </VStack>
            </Card>

            <Card>
              <VStack gap={14}>
                <HStack justify="space-between">
                  <Text variant="h3">Fluency</Text>
                  <Text variant="caption" tone="tertiary">
                    {data.from} → {data.to}
                  </Text>
                </HStack>
                <FluencyMeter {...data.fluency} />
                {data.fluency.rated ? (
                  <HStack gap={16} wrap>
                    <Component
                      label="Accuracy"
                      value={data.fluency.components.accuracy}
                    />
                    <Component
                      label="Pace"
                      value={data.fluency.components.speed}
                    />
                    <Component
                      label="Consistency"
                      value={data.fluency.components.consistency}
                    />
                  </HStack>
                ) : null}
              </VStack>
            </Card>

            {proof ? <ProofOfProgressCard data={proof} /> : null}

            {subjects?.length ? (
              <Card>
                <VStack gap={14}>
                  <Text variant="h3">Subjects</Text>
                  {subjects.map((s) => (
                    <VStack key={s.subject} gap={5}>
                      <HStack justify="space-between">
                        <Text variant="label">{prettySubject(s.subject)}</Text>
                        <Text variant="label-sm" tone="tertiary" numeric>
                          {Math.round(s.accuracy * 100)}% · {s.sessions} session
                          {s.sessions === 1 ? "" : "s"}
                        </Text>
                      </HStack>
                      <Bar value={s.accuracy} />
                    </VStack>
                  ))}
                </VStack>
              </Card>
            ) : null}

            {mastery?.skills?.length ? (
              <Card>
                <VStack gap={14}>
                  <VStack gap={3}>
                    <Text variant="h3">Where they're strong</Text>
                    <Text variant="caption" tone="tertiary">
                      Broken down by skill, not just by topic.
                    </Text>
                  </VStack>

                  {mastery.skills
                    .filter((s) => s.attempted >= 3)
                    .slice(0, 8)
                    .map((s) => (
                      <VStack key={s.skill} gap={5}>
                        <HStack justify="space-between" gap={10}>
                          <Text
                            variant="body-sm"
                            style={{ flex: 1 }}
                            numberOfLines={1}
                          >
                            {s.skill}
                          </Text>
                          <Text variant="label-sm" tone="tertiary" numeric>
                            {s.correct}/{s.attempted}
                          </Text>
                        </HStack>
                        <Bar value={s.accuracy} />
                      </VStack>
                    ))}

                  {mastery.skills.filter((s) => s.attempted >= 3).length ===
                  0 ? (
                    <Text variant="body-sm" tone="tertiary">
                      A few more sessions and the per-skill breakdown will
                      appear.
                    </Text>
                  ) : null}
                </VStack>
              </Card>
            ) : null}

            {child ? <ReportsCard child={child} /> : null}
          </>
        )}
      </VStack>
    </Screen>
  );
}

function Component({ label, value }: { label: string; value: number }) {
  return (
    <VStack gap={1}>
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
      <Text variant="label" numeric>
        {Math.round(value * 100)}%
      </Text>
    </VStack>
  );
}

function Bar({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        height: 8,
        borderRadius: radius.full,
        backgroundColor: theme.surface.sunken,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${Math.max(2, Math.min(100, value * 100))}%`,
          height: "100%",
          borderRadius: radius.full,
          backgroundColor: theme.brand[500],
        }}
      />
    </View>
  );
}

function prettySubject(code: string) {
  return code
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
