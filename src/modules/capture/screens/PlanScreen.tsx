import React from "react";
import { View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock, RefreshCw, Play, BookOpen } from "lucide-react-native";
import { apiErrorMessage } from "@api/apiClient";
import { useTheme } from "@shared/useTheme";
import { useFontStore, type LanguageCode } from "@shared/fonts";
import { useAppNavigation, goToTab, type AppStackParamList } from "@navigation/types";
import {
  Screen,
  Text,
  Button,
  Card,
  VStack,
  HStack,
  Banner,
  Chip,
  LoadingState,
  ErrorState,
} from "@shared/ui";
import { planApi, sessionApi } from "@modules/session/api/sessionApi";

/**
 * The plan, before it is run. The parent sees the topic, the shape of the
 * thirty minutes and the opening of their script before committing, and can
 * regenerate if it read their intent wrongly.
 *
 * It polls: generation returns at `parent_ready` (~4s) and finishes the rest in
 * the background, so Start is enabled only at `ready`.
 */
export default function PlanScreen() {
  const route = useRoute<RouteProp<AppStackParamList, "Plan">>();
  const navigation = useAppNavigation();
  const theme = useTheme();
  const ensureFont = useFontStore((s) => s.ensure);
  const planId = route.params?.planId;

  const { data: plan, error } = useQuery({
    queryKey: ["plan", planId],
    queryFn: () => planApi.get(planId),
    /**
     * Polls only while the plan is still being built, then stops. A fixed
     * interval would keep hitting the API for as long as the parent reads.
     */
    refetchInterval: (q) => (q.state.data?.status === "ready" ? false : 1500),
  });

  React.useEffect(() => {
    if (plan) void ensureFont(plan.languages.parent.code as LanguageCode);
  }, [plan, ensureFont]);

  const start = useMutation({
    mutationFn: () => sessionApi.start({ studyPlanId: planId, childId: plan!.childId }),
    onSuccess: (res) =>
      navigation.navigate("Session", { sessionId: res.session.id }),
  });

  const regenerate = useMutation({
    mutationFn: () => planApi.regenerate(planId),
    onSuccess: (fresh) => navigation.navigate("Plan", { planId: fresh.id }),
  });

  if (error) {
    return (
      <Screen title="Session plan">
        <ErrorState
          message={apiErrorMessage(error, "We couldn't open that plan")}
          onRetry={() => goToTab(navigation)}
        />
      </Screen>
    );
  }

  if (!plan) return <LoadingState label="Building your session…" />;

  const parentLang = plan.languages.parent.code as LanguageCode;
  const ready = plan.status === "ready";

  return (
    <Screen
      title={plan.topic.title}
      subtitle={plan.topic.chapter || undefined}
      overline="TONIGHT'S SESSION"
    >
      <VStack gap={18} style={{ maxWidth: 620 }}>
        {/**
         * A degraded plan says so, plainly, with a way out. Passing a template
         * off as a generated plan would teach the parent that the product is
         * shallow rather than that it had a bad minute.
         */}
        {plan.degraded ? (
          <Banner
            tone="warning"
            title="We couldn't reach our AI just now"
            body="Here's a structured session you can still run tonight — or try building it again."
            action={
              <Button
                label="Try again"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={() => regenerate.mutate()}
                loading={regenerate.isPending}
              />
            }
          />
        ) : null}

        {plan.grounding === "material" ? (
          <Banner
            tone="info"
            title="Built from your photo"
            body="The questions come from the page you scanned, not from a general syllabus."
          />
        ) : null}

        {/* The shape of the thirty minutes. */}
        <Card>
          <VStack gap={14}>
            <HStack justify="space-between">
              <HStack gap={8}>
                <Clock size={16} color={theme.text.accent} />
                <Text variant="label" tone="accent">
                  30 minutes, five phases
                </Text>
              </HStack>
              {plan.languages.isDual ? (
                <Chip
                  label={`${plan.languages.parent.label} · ${plan.languages.child.label}`}
                  tone="moss"
                />
              ) : null}
            </HStack>

            <VStack gap={10}>
              {plan.phases.map((phase) => (
                <HStack key={phase.key} gap={12}>
                  <View
                    style={{
                      width: 34,
                      alignItems: "center",
                    }}
                  >
                    <Text variant="label-sm" tone="tertiary" numeric>
                      {Math.round(phase.seconds / 60)}m
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 3,
                      alignSelf: "stretch",
                      borderRadius: 2,
                      backgroundColor: phase.ready ? theme.brand[400] : theme.border.default,
                    }}
                  />
                  <VStack gap={1} flex={1}>
                    <HStack gap={6}>
                      <Text variant="label">{phase.title}</Text>
                      {!phase.ready ? (
                        <Text variant="caption" tone="disabled">
                          preparing…
                        </Text>
                      ) : null}
                    </HStack>
                    <Text variant="caption" tone="tertiary">
                      {phase.audience === "parent" ? "You" : "Your child"} · {phase.objective}
                    </Text>
                  </VStack>
                </HStack>
              ))}
            </VStack>
          </VStack>
        </Card>

        {/**
         * A preview of the parent's own script — the first thing they will read
         * aloud. Seeing it before committing is what makes this a decision
         * rather than a leap of faith.
         */}
        {plan.concept.script ? (
          <Card tone="sunken">
            <VStack gap={8}>
              <HStack gap={8}>
                <BookOpen size={15} color={theme.text.tertiary} />
                <Text variant="label-sm" tone="tertiary">
                  YOU'LL START BY SAYING
                </Text>
              </HStack>
              <Text variant="body" language={parentLang} numberOfLines={4}>
                {plan.concept.script}
              </Text>
            </VStack>
          </Card>
        ) : null}

        <VStack gap={10}>
          <Button
            label={ready ? "Start the session" : "Preparing the questions…"}
            icon={ready ? <Play size={16} color="#FFFFFF" /> : undefined}
            onPress={() => start.mutate()}
            loading={start.isPending}
            disabled={!ready}
            size="lg"
          />
          {!ready ? (
            <Text variant="caption" tone="tertiary" align="center">
              Your teaching guide is ready — the questions take a few more seconds.
            </Text>
          ) : null}

          <Button
            label="Not what I meant — build another"
            variant="ghost"
            icon={<RefreshCw size={15} color={theme.text.accent} />}
            onPress={() => regenerate.mutate()}
            loading={regenerate.isPending}
          />
        </VStack>

        {start.error ? (
          <Banner
            tone="danger"
            title="Couldn't start"
            body={apiErrorMessage(start.error)}
          />
        ) : null}
      </VStack>
    </Screen>
  );
}
