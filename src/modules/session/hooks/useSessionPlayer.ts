import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  createRuntime,
  advance,
  pause,
  resume,
  currentPhase,
  remainingSeconds,
  isOverrunning,
  segments,
  isFinished,
  type RuntimeState,
} from "../sessionRuntime";
import {
  sessionApi,
  type StudyPlan,
  type CompletionResult,
} from "../api/sessionApi";
import { summarise, type Verdict } from "../grading";

export interface AnswerRecord {
  given: string;
  verdict: Verdict;
  answerMs: number;
}

/**
 * The session player's state. `sessionRuntime` owns the countdown from
 * wall-clock timestamps; this only re-renders on a tick and pushes to the
 * outbox — so the interval below can be suspended, throttled or dropped and the
 * time shown stays correct.
 */
export function useSessionPlayer({
  sessionId,
  studyPlanId,
  childId,
  plan,
  startingPhase,
}: {
  sessionId: string;
  studyPlanId: string;
  childId: string;
  plan: StudyPlan | null;
  startingPhase?: number;
}) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<RuntimeState>(() =>
    createRuntime({
      sessionId,
      studyPlanId,
      childId,
      currentPhase: startingPhase,
    }),
  );
  const [now, setNow] = useState(() => Date.now());

  const [practiceAnswers, setPracticeAnswers] = useState<
    Record<number, AnswerRecord>
  >({});
  const [mockAnswers, setMockAnswers] = useState<Record<number, AnswerRecord>>(
    {},
  );
  const [revision, setRevision] = useState<StudyPlan["revision"]>(null);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [completion, setCompletion] = useState<CompletionResult | null>(null);
  const [completing, setCompleting] = useState(false);
  /**
   * Whether completion has been ATTEMPTED — which is a different fact from
   * whether it succeeded.
   *
   * `completion` is null both before finishing and after finishing offline (the
   * request went to the outbox), so it cannot gate the celebration. An earlier
   * version tested `completion !== undefined`, which is always true and
   * therefore tested nothing.
   */
  const [completed, setCompleted] = useState(false);

  /**
   * True only while the session is paused because the app left the foreground,
   * so returning does not cancel a pause the parent set deliberately.
   */
  const autoPaused = useRef(false);

  /**
   * One interval, purely to re-render. It is NOT the clock — dropping ticks
   * costs nothing because the time is derived from timestamps on every render.
   */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /**
   * Leaving the app pauses the session; coming back resumes it.
   *
   * Elapsed time is derived from wall-clock timestamps, so without this a phone
   * call, a switch to WhatsApp or a screen lock all counted as study time. A
   * five-minute session left open recorded up to sixty minutes — the server
   * clamps each phase at twice its budget, and that clamp was the only thing
   * bounding it. Reported by a parent as "40 minutes studied after five".
   *
   * `pause`/`resume` accumulate the away span into `pausedMs` rather than
   * stopping a counter, which keeps the wall-clock derivation intact — the
   * alternative is a counter kept running by something, and that something is
   * exactly what the OS suspends.
   *
   * Returning to the foreground also forces an immediate re-render: without it
   * the old time shows for up to a second, which looks like a stalled timer.
   */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        /**
         * Only un-pause what leaving the app paused. A parent who tapped Pause
         * before putting the phone down must come back to a session that is
         * still paused — resuming it for them would restart the clock on a
         * child who has gone to get a glass of water.
         */
        if (autoPaused.current) {
          autoPaused.current = false;
          setState((s) => (s.completedAt ? s : resume(s, Date.now())));
        }
        setNow(Date.now());
      } else {
        // "background" and "inactive" both mean the parent is no longer
        // looking. iOS reports "inactive" for the app switcher and for a
        // notification shade, and treating it as still-studying is how a
        // glance at a message becomes ten minutes of recorded work.
        setState((s) => {
          if (s.completedAt || s.pausedAt) return s; // already paused by hand
          autoPaused.current = true;
          return pause(s, Date.now());
        });
      }
    });
    return () => sub.remove();
  }, []);

  const phase = currentPhase(state);
  const phaseKey = phase?.key ?? "concept";

  const recordPractice = useCallback((index: number, result: AnswerRecord) => {
    setPracticeAnswers((prev) => ({ ...prev, [index]: result }));
  }, []);

  const recordMock = useCallback((index: number, result: AnswerRecord) => {
    setMockAnswers((prev) => ({ ...prev, [index]: result }));
  }, []);

  /**
   * Answers are flushed at the PHASE BOUNDARY, not per question.
   *
   * One request per answer means six round trips inside a six-minute phase on a
   * phone that may be on a weak connection — which is exactly when they would
   * fail. The device already showed the child their result, so there is nothing
   * to wait for.
   */
  const flushAnswers = useCallback(
    async (
      which: "practice" | "mock",
      answers: Record<number, AnswerRecord>,
    ) => {
      const payload = Object.entries(answers).map(([index, a]) => ({
        phase: which,
        questionIndex: Number(index),
        given: a.given,
        answerMs: a.answerMs,
      }));
      if (payload.length) await sessionApi.submitAnswers(sessionId, payload);
    },
    [sessionId],
  );

  /** Phase 5's content, fetched as phase 4 ends so it is there on arrival. */
  const loadRevision = useCallback(async () => {
    setRevisionLoading(true);
    try {
      const r = await sessionApi.revision(sessionId);
      setRevision(r.revision);
    } catch {
      /**
       * Never blocks the session. The plan already holds every correct answer
       * and explanation, so the phase still has content — it loses only the
       * "why this mistake happens" insight, which is precisely why phase 5 was
       * designed not to be load-bearing.
       */
      setRevision(null);
    } finally {
      setRevisionLoading(false);
    }
  }, [sessionId]);

  const advancePhase = useCallback(async () => {
    const from = currentPhase(state)?.key;
    const result = advance(state, Date.now());
    setState(result.state);
    setNow(Date.now());

    if (result.checkpoint) {
      // Queued, not awaited: the UI moves the moment the parent taps.
      void sessionApi.checkpoint(
        sessionId,
        result.checkpoint.phaseIndex,
        result.checkpoint.actualSeconds,
      );
    }

    if (from === "practice") void flushAnswers("practice", practiceAnswers);
    if (from === "mock") {
      await flushAnswers("mock", mockAnswers);
      // Only now do the misses exist, so only now can phase 5 be built.
      void loadRevision();
    }
  }, [
    state,
    sessionId,
    practiceAnswers,
    mockAnswers,
    flushAnswers,
    loadRevision,
  ]);

  const togglePause = useCallback(() => {
    // A deliberate tap takes ownership of the pause either way: pausing by hand
    // must survive a trip to the home screen, and resuming by hand must not be
    // undone by the next foreground event.
    autoPaused.current = false;
    setState((s) =>
      s.pausedAt ? resume(s, Date.now()) : pause(s, Date.now()),
    );
    setNow(Date.now());
  }, []);

  const complete = useCallback(async () => {
    setCompleting(true);
    try {
      /**
       * Close the final phase FIRST.
       *
       * "Finish session" is pressed while phase 5 is still open, so without
       * this the phase is never checkpointed, the session never reads as
       * finished, and the celebration never renders — the bug a browser test
       * caught. Closing it also sends phase 5's duration, without which the
       * timer-adherence score is computed over four phases out of five.
       */
      setState((s) => {
        const result = advance(s, Date.now());
        if (result.checkpoint) {
          void sessionApi.checkpoint(
            sessionId,
            result.checkpoint.phaseIndex,
            result.checkpoint.actualSeconds,
          );
        }
        return result.state;
      });

      // Anything not yet flushed goes next, so the server scores a complete
      // session rather than one missing its last phase.
      await flushAnswers("practice", practiceAnswers);
      await flushAnswers("mock", mockAnswers);

      const result = await sessionApi.complete(sessionId);
      setCompletion(result);
      setCompleted(true);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      return result;
    } finally {
      setCompleting(false);
    }
  }, [sessionId, practiceAnswers, mockAnswers, flushAnswers, queryClient]);

  /** Locally computed, so the completion screen works offline. */
  const localScore = summarise([
    ...Object.values(practiceAnswers).map((a) => a.verdict),
    ...Object.values(mockAnswers).map((a) => a.verdict),
  ]);

  const answersFor = (which: "practice" | "mock") =>
    which === "practice" ? practiceAnswers : mockAnswers;

  /**
   * Whether the parent may move on.
   *
   * The question phases wait for every question to be answered — a phase
   * advanced halfway records blanks the child never saw. Everything else is the
   * parent's judgement, because only they know whether their child understood.
   */
  const canAdvance = (() => {
    if (!plan) return false;
    if (phaseKey === "practice") {
      return (
        Object.keys(practiceAnswers).length >= (plan.practice?.length ?? 0)
      );
    }
    if (phaseKey === "mock") {
      return Object.keys(mockAnswers).length >= (plan.mock?.length ?? 0);
    }
    return true;
  })();

  return {
    state,
    phase,
    phaseKey,
    now,
    remaining: remainingSeconds(state, now),
    overrunning: isOverrunning(state, now),
    paused: Boolean(state.pausedAt),
    segments: segments(state, now),
    finished: isFinished(state),
    canAdvance,

    practiceAnswers,
    mockAnswers,
    answersFor,
    recordPractice,
    recordMock,

    revision,
    revisionLoading,
    localScore,
    completion,
    completing,
    completed,

    advancePhase,
    togglePause,
    complete,
  };
}
