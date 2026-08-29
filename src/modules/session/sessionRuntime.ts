/**
 * The client-side session runtime — pure, no React, no IO, fully tested.
 *
 * The client owns the countdown (spec DECISION 3), because the PRD requires a
 * running session to survive losing the network and a server-authoritative
 * timer cannot do that.
 *
 * THE ONE RULE THAT MATTERS: time is derived from WALL-CLOCK TIMESTAMPS, never
 * accumulated from interval ticks.
 *
 * A `setInterval` that decrements a counter is wrong in three ways that all
 * happen in normal use: the OS suspends timers when the app is backgrounded, so
 * a parent who checks a message loses however long they were away; browsers
 * throttle intervals in inactive tabs to once a minute; and small per-tick
 * drift compounds over 30 minutes. Storing `startedAt` and computing
 * `now - startedAt` is immune to all three — the interval then exists only to
 * trigger a re-render, and dropping ticks costs nothing.
 */

export const PHASES = [
  { index: 1, key: "concept", title: "Concept", seconds: 600, audience: "parent" },
  { index: 2, key: "teaching", title: "Teaching", seconds: 480, audience: "parent" },
  { index: 3, key: "practice", title: "Practice", seconds: 360, audience: "child" },
  { index: 4, key: "mock", title: "Quick test", seconds: 180, audience: "child" },
  { index: 5, key: "revision", title: "Revision", seconds: 180, audience: "parent" },
] as const;

export type PhaseKey = (typeof PHASES)[number]["key"];
export const TOTAL_SECONDS = PHASES.reduce((s, p) => s + p.seconds, 0); // 1800

export interface PhaseState {
  index: number;
  key: PhaseKey;
  plannedSeconds: number;
  /** Epoch ms when this phase began. Null until it starts. */
  startedAt: number | null;
  endedAt: number | null;
  /** Accumulated paused time, so a pause does not eat the phase's budget. */
  pausedMs: number;
  completed: boolean;
  skipped: boolean;
}

export interface RuntimeState {
  sessionId: string;
  studyPlanId: string;
  childId: string;
  currentPhase: number;
  phases: PhaseState[];
  startedAt: number;
  /** Epoch ms when the parent paused, or null while running. */
  pausedAt: number | null;
  completedAt: number | null;
}

export function initialPhases(): PhaseState[] {
  return PHASES.map((p) => ({
    index: p.index,
    key: p.key,
    plannedSeconds: p.seconds,
    startedAt: null,
    endedAt: null,
    pausedMs: 0,
    completed: false,
    skipped: false,
  }));
}

export function createRuntime(input: {
  sessionId: string;
  studyPlanId: string;
  childId: string;
  now?: number;
  /** Resuming a session the server already knows about. */
  currentPhase?: number;
}): RuntimeState {
  const now = input.now ?? Date.now();
  const phases = initialPhases();
  const start = input.currentPhase ?? 1;

  /**
   * Resuming marks the earlier phases complete WITHOUT inventing durations for
   * them. The server holds the real timings from when they were checkpointed;
   * fabricating them here would overwrite the truth with a guess on every
   * resume.
   */
  for (const p of phases) {
    if (p.index < start) {
      p.completed = true;
      p.skipped = true;
    }
  }
  const active = phases.find((p) => p.index === start);
  if (active) active.startedAt = now;

  return {
    sessionId: input.sessionId,
    studyPlanId: input.studyPlanId,
    childId: input.childId,
    currentPhase: start,
    phases,
    startedAt: now,
    pausedAt: null,
    completedAt: null,
  };
}

export function currentPhase(state: RuntimeState): PhaseState | undefined {
  return state.phases.find((p) => p.index === state.currentPhase);
}

/** Seconds actually spent in a phase, excluding paused time. */
export function elapsedSeconds(
  state: RuntimeState,
  phase: PhaseState,
  now = Date.now(),
): number {
  if (!phase.startedAt) return 0;
  const end = phase.endedAt ?? (state.pausedAt ?? now);
  return Math.max(0, Math.floor((end - phase.startedAt - phase.pausedMs) / 1000));
}

/**
 * Seconds left in the current phase. Can go NEGATIVE, deliberately.
 *
 * The timer is a pacing aid, not a gate — the PRD's phases are time-BOXED, not
 * time-limited, and a parent mid-explanation must not be cut off. The UI shows
 * an overrun rather than jumping to the next phase on its own.
 */
export function remainingSeconds(state: RuntimeState, now = Date.now()): number {
  const phase = currentPhase(state);
  if (!phase) return 0;
  return phase.plannedSeconds - elapsedSeconds(state, phase, now);
}

export function isOverrunning(state: RuntimeState, now = Date.now()): boolean {
  return remainingSeconds(state, now) < 0;
}

/**
 * Ring progress, 0–1.
 *
 * Completed phases contribute their PLANNED length, not their actual one, so
 * the ring advances at a predictable rate. A ring that jumped backwards when a
 * family finished a phase early would be worse than useless as a sense of
 * where you are.
 */
export function progress(state: RuntimeState, now = Date.now()): number {
  const done = state.phases
    .filter((p) => p.completed)
    .reduce((s, p) => s + p.plannedSeconds, 0);
  const phase = currentPhase(state);
  const inPhase = phase && !phase.completed
    ? Math.min(phase.plannedSeconds, elapsedSeconds(state, phase, now))
    : 0;
  return Math.min(1, (done + inPhase) / TOTAL_SECONDS);
}

/** Per-phase fill, for the segmented ring. */
export function segments(state: RuntimeState, now = Date.now()) {
  return state.phases.map((p) => {
    const elapsed = elapsedSeconds(state, p, now);
    return {
      key: p.key,
      index: p.index,
      plannedSeconds: p.plannedSeconds,
      /** Share of the whole 30 minutes this segment occupies. */
      share: p.plannedSeconds / TOTAL_SECONDS,
      fill: p.completed ? 1 : Math.min(1, elapsed / p.plannedSeconds),
      active: p.index === state.currentPhase && !p.completed,
      completed: p.completed,
    };
  });
}

/**
 * Closes the current phase and opens the next.
 *
 * Returns the checkpoint to send as well as the new state — the caller queues
 * it through the outbox, which is what makes the transition survive being
 * offline.
 */
export function advance(
  state: RuntimeState,
  now = Date.now(),
): { state: RuntimeState; checkpoint: { phaseIndex: number; actualSeconds: number } | null } {
  const phase = currentPhase(state);
  if (!phase || phase.completed) return { state, checkpoint: null };

  const actualSeconds = elapsedSeconds(state, phase, now);
  const phases = state.phases.map((p) =>
    p.index === phase.index ? { ...p, completed: true, endedAt: now } : p,
  );

  const next = phases.find((p) => !p.completed);
  if (next && !next.startedAt) next.startedAt = now;

  return {
    state: {
      ...state,
      phases,
      currentPhase: next ? next.index : PHASES.length,
      // Advancing while paused resumes: the parent has clearly moved on.
      pausedAt: null,
    },
    checkpoint: { phaseIndex: phase.index, actualSeconds },
  };
}

/**
 * Pausing records WHEN, and resuming adds the gap to `pausedMs`.
 *
 * The paused span is excluded from the phase's elapsed time rather than
 * stopping a counter, which keeps the wall-clock derivation intact — the
 * alternative is a counter that has to be kept running by something, and that
 * something is exactly what the OS suspends.
 */
export function pause(state: RuntimeState, now = Date.now()): RuntimeState {
  if (state.pausedAt) return state;
  return { ...state, pausedAt: now };
}

export function resume(state: RuntimeState, now = Date.now()): RuntimeState {
  if (!state.pausedAt) return state;
  const gap = Math.max(0, now - state.pausedAt);
  return {
    ...state,
    pausedAt: null,
    phases: state.phases.map((p) =>
      p.index === state.currentPhase ? { ...p, pausedMs: p.pausedMs + gap } : p,
    ),
  };
}

export function isFinished(state: RuntimeState): boolean {
  return state.phases.every((p) => p.completed);
}

/** Whole minutes studied — what the completion screen reports. */
export function minutesStudied(state: RuntimeState, now = Date.now()): number {
  const seconds = state.phases.reduce((s, p) => s + elapsedSeconds(state, p, now), 0);
  return Math.round(seconds / 60);
}

/** "12:34" — always two digits, never negative in the display. */
export function formatClock(seconds: number): string {
  const abs = Math.abs(Math.trunc(seconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
