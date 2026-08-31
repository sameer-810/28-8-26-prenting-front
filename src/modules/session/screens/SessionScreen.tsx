import React, { useEffect, useState } from "react";
import { View, ScrollView, Pressable, Platform } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Pause, Play, X, ChevronRight } from "lucide-react-native";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { useOfflineStore } from "@shared/offline/useOfflineStore";
import { useAppNavigation, goToTab, type AppStackParamList } from "@navigation/types";
import { Text, Button, VStack, HStack, LoadingState, ErrorState, Banner } from "@shared/ui";
import { useBreakpoint } from "@shared/ui/useBreakpoint";
import { sessionApi, cachedPlan, clearCachedPlan, type StudyPlan } from "../api/sessionApi";
import { PHASES as RUNTIME_PHASES } from "../sessionRuntime";
import { useSessionPlayer } from "../hooks/useSessionPlayer";
import { SessionRing } from "../components/SessionRing";
import {
  ConceptPhase,
  TeachingPhase,
  QuestionPhase,
  RevisionPhase,
} from "../components/PhaseContent";
import { CompletionSheet } from "../components/CompletionSheet";

/**
 * The 30-minute session player. Three things it does on purpose:
 *
 *   · reads the plan from the DEVICE CACHE first, network second, so a session
 *     that began online survives the network going
 *   · no tab bar and one exit, so nobody wanders out of a running session
 *   · sticky ring — content scrolls under it, so the time is always visible
 */
export default function SessionScreen() {
  const route = useRoute<RouteProp<AppStackParamList, "Session">>();
  const navigation = useAppNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();
  const isOnline = useOfflineStore((s) => s.isOnline);

  const sessionId = route.params?.sessionId;
  const [offlinePlan, setOfflinePlan] = useState<StudyPlan | null>(null);
  const [showExit, setShowExit] = useState(false);

  /**
   * The cache is read FIRST and unconditionally.
   *
   * If the network has gone, the query below fails and this is the only copy of
   * the plan — which is the entire offline guarantee. Reading it eagerly rather
   * than as a fallback also means the player renders instantly on a resume.
   */
  useEffect(() => {
    let alive = true;
    cachedPlan(sessionId).then((p) => {
      if (alive && p) setOfflinePlan(p);
    });
    return () => {
      alive = false;
    };
  }, [sessionId]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => sessionApi.get(sessionId),
    // The session's own record is authoritative for which phase it is on; a
    // stale copy would resume a parent into a phase they already finished.
    staleTime: 0,
    retry: false,
  });

  const plan = data?.plan ?? offlinePlan;
  const session = data?.session;

  const player = useSessionPlayer({
    sessionId,
    studyPlanId: plan?.id ?? "",
    childId: plan?.childId ?? "",
    plan: plan ?? null,
    startingPhase: session?.currentPhase,
  });

  if (isLoading && !plan) return <LoadingState label="Opening the session…" />;

  if (!plan) {
    return (
      <ErrorState
        offline={!isOnline}
        title={isOnline ? "We couldn't open that session" : "You're offline"}
        message={
          isOnline
            ? "It may have been finished or removed."
            : "This session wasn't saved to this device, so it can't be opened offline."
        }
        onRetry={() => goToTab(navigation)}
      />
    );
  }

  if (error && !offlinePlan) {
    return <ErrorState offline={!isOnline} onRetry={() => goToTab(navigation)} />;
  }

  /**
   * The PLAYER uses the runtime's short phase names ("Teaching"), not the
   * server's formal ones ("Guided Parent Teaching").
   *
   * Two different jobs. The plan screen is explaining what the thirty minutes
   * contain and has room for the full name; the ring and the Next button are
   * chrome inside a fixed slot, where a four-word title wraps or truncates. The
   * server's names stay authoritative on the plan overview.
   */
  const phaseMeta = RUNTIME_PHASES.find((p) => p.key === player.phaseKey);

  const content = (() => {
    switch (player.phaseKey) {
      case "concept":
        return <ConceptPhase plan={plan} />;
      case "teaching":
        return <TeachingPhase plan={plan} />;
      case "practice":
        return (
          <QuestionPhase
            plan={plan}
            questions={plan.practice}
            phase="practice"
            answers={player.practiceAnswers}
            onAnswered={player.recordPractice}
          />
        );
      case "mock":
        return (
          <QuestionPhase
            plan={plan}
            questions={plan.mock}
            phase="mock"
            answers={player.mockAnswers}
            onAnswered={player.recordMock}
          />
        );
      case "revision":
        return (
          <RevisionPhase
            plan={plan}
            revision={player.revision}
            loading={player.revisionLoading}
            perfect={player.localScore.attempted > 0 && player.localScore.incorrect === 0}
          />
        );
      default:
        return null;
    }
  })();

  const isLastPhase = player.phaseKey === "revision";

  const ring = (
    <SessionRing
      segments={player.segments}
      remainingSeconds={player.remaining}
      phaseTitle={phaseMeta?.title ?? ""}
      phaseIndex={player.state.currentPhase}
      overrunning={player.overrunning}
      paused={player.paused}
      size={isWide ? 236 : 190}
    />
  );

  const controls = (
    <VStack gap={10}>
      <Button
        label={isLastPhase ? "Finish session" : `Next: ${nextPhaseTitle(player.state.currentPhase)}`}
        onPress={async () => {
          if (isLastPhase) {
            await player.complete();
          } else {
            await player.advancePhase();
          }
        }}
        loading={player.completing}
        disabled={!player.canAdvance}
        rightIcon={!isLastPhase ? <ChevronRight size={16} color="#FFFFFF" /> : undefined}
        size="lg"
      />
      {!player.canAdvance ? (
        <Text variant="caption" tone="tertiary" align="center">
          Answer every question to move on
        </Text>
      ) : null}
    </VStack>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface.secondary }}>
      {/* Header: the one way out, and the pause. */}
      <HStack
        justify="space-between"
        style={{
          paddingTop: Platform.OS === "web" ? 14 : insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 10,
        }}
      >
        <Pressable
          onPress={() => setShowExit(true)}
          accessibilityRole="button"
          accessibilityLabel="Leave session"
          hitSlop={12}
          style={{ padding: 6 }}
        >
          <X size={22} color={theme.text.tertiary} />
        </Pressable>

        <VStack gap={0} align="center" flex={1}>
          <Text variant="label" numberOfLines={1}>
            {plan.topic.title}
          </Text>
          {plan.topic.chapter ? (
            <Text variant="caption" tone="tertiary" numberOfLines={1}>
              {plan.topic.chapter}
            </Text>
          ) : null}
        </VStack>

        <Pressable
          onPress={player.togglePause}
          accessibilityRole="button"
          accessibilityLabel={player.paused ? "Resume" : "Pause"}
          hitSlop={12}
          style={{ padding: 6 }}
        >
          {player.paused ? (
            <Play size={20} color={theme.text.accent} />
          ) : (
            <Pause size={20} color={theme.text.tertiary} />
          )}
        </Pressable>
      </HStack>

      {isWide ? (
        /* Desktop: the ring and controls sit beside the content, always visible. */
        <View style={{ flex: 1, flexDirection: "row", padding: 24, gap: 28 }}>
          <VStack gap={20} align="center" style={{ width: 280 }}>
            {ring}
            {controls}
          </VStack>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={{ maxWidth: 760 }}>{content}</View>
          </ScrollView>
        </View>
      ) : (
        /* Phone: the ring is pinned, the content scrolls under it. */
        <View style={{ flex: 1 }}>
          <View style={{ alignItems: "center", paddingBottom: 12 }}>{ring}</View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: 16,
              paddingBottom: insets.bottom + 16,
              backgroundColor: theme.surface.primary,
              borderTopWidth: 1,
              borderTopColor: theme.border.default,
            }}
          >
            {controls}
          </View>
        </View>
      )}

      {/**
       * Leaving mid-session asks, because a mis-tap on the X would otherwise
       * end an evening's work. The wording says what actually happens — the
       * session is kept and can be resumed, per the six-hour window.
       */}
      {showExit ? (
        <View
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(31,28,23,0.5)",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: theme.surface.primary,
              borderRadius: radius.xl,
              padding: 22,
              width: "100%",
              maxWidth: 420,
            }}
          >
            <VStack gap={14}>
              <Text variant="h2">Leave this session?</Text>
              <Text variant="body" tone="secondary">
                It'll be saved and you can pick it up where you left off for the
                next few hours.
              </Text>
              <VStack gap={8}>
                <Button label="Keep going" onPress={() => setShowExit(false)} />
                <Button
                  label="Leave for now"
                  variant="secondary"
                  onPress={() => {
                    setShowExit(false);
                    goToTab(navigation);
                  }}
                />
              </VStack>
            </VStack>
          </View>
        </View>
      ) : null}

      {/* The celebration, once completion has been attempted. */}
      {player.completed ? (
        <CompletionSheet
          plan={plan}
          result={player.completion}
          localScore={player.localScore}
          minutes={Math.round(
            player.state.phases.reduce((s, p) => s + p.plannedSeconds, 0) / 60,
          )}
          onDone={async () => {
            await clearCachedPlan(sessionId);
            goToTab(navigation);
          }}
        />
      ) : null}

      {!isOnline ? (
        <View style={{ position: "absolute", top: insets.top + 54, left: 16, right: 16 }}>
          <Banner
            tone="info"
            title="Offline — carry on"
            body="Everything is saved on this device and will sync when you're back."
          />
        </View>
      ) : null}
    </View>
  );
}

function nextPhaseTitle(currentIndex: number): string {
  return RUNTIME_PHASES.find((p) => p.index === currentIndex + 1)?.title ?? "Finish";
}
