import test from "node:test";
import assert from "node:assert/strict";
import {
  createRuntime,
  advance,
  pause,
  resume,
  elapsedSeconds,
  remainingSeconds,
  isOverrunning,
  progress,
  segments,
  isFinished,
  minutesStudied,
  formatClock,
  currentPhase,
  TOTAL_SECONDS,
} from "./sessionRuntime.ts";

const T0 = 1_800_000_000_000; // A fixed epoch, so nothing depends on the clock.
const sec = (n: number) => T0 + n * 1000;

const fresh = () =>
  createRuntime({ sessionId: "s1", studyPlanId: "p1", childId: "c1", now: T0 });

test("a new session starts in phase 1 with the PRD's allocations", () => {
  const s = fresh();
  assert.equal(s.currentPhase, 1);
  assert.deepEqual(s.phases.map((p) => p.plannedSeconds), [600, 480, 360, 180, 180]);
  assert.equal(TOTAL_SECONDS, 1800, "the five phases must total exactly 30 minutes");
});

// ---------------------------------------------------------------------------
// Wall-clock derivation — the reason this module exists
// ---------------------------------------------------------------------------

test("elapsed time comes from timestamps, so a backgrounded app loses nothing", () => {
  /**
   * THE CORE GUARANTEE. A decrementing interval would have lost the ten minutes
   * the OS suspended it for; deriving from `now - startedAt` cannot.
   */
  const s = fresh();
  assert.equal(elapsedSeconds(s, s.phases[0], sec(600)), 600);
});

test("remaining time counts down from the phase budget", () => {
  const s = fresh();
  assert.equal(remainingSeconds(s, T0), 600);
  assert.equal(remainingSeconds(s, sec(120)), 480);
});

test("remaining time goes NEGATIVE rather than forcing the phase to end", () => {
  /**
   * The phases are time-BOXED, not time-limited. A parent mid-explanation must
   * not be cut off — the UI shows an overrun and lets them move on when ready.
   */
  const s = fresh();
  assert.equal(remainingSeconds(s, sec(700)), -100);
  assert.equal(isOverrunning(s, sec(700)), true);
  assert.equal(isOverrunning(s, sec(599)), false);
});

test("formatClock never shows a negative sign or a single-digit second", () => {
  assert.equal(formatClock(600), "10:00");
  assert.equal(formatClock(65), "1:05");
  assert.equal(formatClock(-100), "1:40");
  assert.equal(formatClock(0), "0:00");
});

// ---------------------------------------------------------------------------
// Advancing
// ---------------------------------------------------------------------------

test("advancing closes the phase and reports what to checkpoint", () => {
  const s = fresh();
  const r = advance(s, sec(600));
  assert.deepEqual(r.checkpoint, { phaseIndex: 1, actualSeconds: 600 });
  assert.equal(r.state.currentPhase, 2);
  assert.equal(r.state.phases[0].completed, true);
  assert.equal(r.state.phases[1].startedAt, sec(600), "the next phase opens immediately");
});

test("finishing early reports the ACTUAL seconds, not the budget", () => {
  const s = fresh();
  const r = advance(s, sec(90));
  assert.equal(r.checkpoint?.actualSeconds, 90);
});

test("advancing through all five finishes the session", () => {
  let s = fresh();
  let t = 0;
  for (const secs of [600, 480, 360, 180, 180]) {
    t += secs;
    s = advance(s, sec(t)).state;
  }
  assert.equal(isFinished(s), true);
  assert.equal(minutesStudied(s, sec(t)), 30);
});

test("advancing a completed phase is a no-op with no checkpoint", () => {
  const s = advance(fresh(), sec(600)).state;
  const again = advance({ ...s, currentPhase: 1 }, sec(700));
  assert.equal(again.checkpoint, null, "must not double-report a phase");
});

// ---------------------------------------------------------------------------
// Pausing
// ---------------------------------------------------------------------------

test("a pause does not eat the phase's budget", () => {
  /**
   * A parent who pauses to fetch a textbook should get those minutes back. The
   * paused span is excluded from elapsed time rather than a counter being
   * stopped — a counter is exactly what the OS suspends.
   */
  let s = fresh();
  s = pause(s, sec(120));
  s = resume(s, sec(420)); // Five minutes away.
  assert.equal(elapsedSeconds(s, s.phases[0], sec(480)), 180, "2 min before + 1 min after");
  assert.equal(remainingSeconds(s, sec(480)), 420);
});

test("elapsed time is frozen while paused", () => {
  const s = pause(fresh(), sec(120));
  assert.equal(elapsedSeconds(s, s.phases[0], sec(600)), 120);
  assert.equal(elapsedSeconds(s, s.phases[0], sec(9999)), 120);
});

test("pausing twice or resuming when not paused changes nothing", () => {
  const once = pause(fresh(), sec(60));
  assert.equal(pause(once, sec(120)).pausedAt, sec(60));
  assert.equal(resume(fresh(), sec(60)).pausedAt, null);
});

test("advancing while paused resumes — the parent has clearly moved on", () => {
  const s = pause(fresh(), sec(120));
  const r = advance(s, sec(300));
  assert.equal(r.state.pausedAt, null);
  assert.equal(r.checkpoint?.actualSeconds, 120, "the paused span is not counted");
});

// ---------------------------------------------------------------------------
// Progress and the ring
// ---------------------------------------------------------------------------

test("progress fills smoothly and reaches exactly 1", () => {
  const s = fresh();
  assert.equal(progress(s, T0), 0);
  assert.ok(Math.abs(progress(s, sec(300)) - 300 / 1800) < 1e-9);

  let done = fresh();
  let t = 0;
  for (const secs of [600, 480, 360, 180, 180]) {
    t += secs;
    done = advance(done, sec(t)).state;
  }
  assert.equal(progress(done, sec(t)), 1);
});

test("progress never jumps backwards when a phase finishes early", () => {
  // Completed phases count their PLANNED length, so finishing phase 1 in two
  // minutes still advances the ring by ten minutes' worth.
  const s = advance(fresh(), sec(120)).state;
  assert.ok(Math.abs(progress(s, sec(120)) - 600 / 1800) < 1e-9);
});

test("progress never exceeds 1, even overrunning the last phase", () => {
  let s = fresh();
  let t = 0;
  for (const secs of [600, 480, 360, 180]) {
    t += secs;
    s = advance(s, sec(t)).state;
  }
  assert.equal(progress(s, sec(t + 10_000)), 1);
});

test("segments describe the ring: sized by budget, filled by elapsed", () => {
  const s = fresh();
  const segs = segments(s, sec(300));
  assert.equal(segs.length, 5);
  assert.ok(Math.abs(segs.reduce((a, x) => a + x.share, 0) - 1) < 1e-9, "shares total 1");
  assert.ok(Math.abs(segs[0].share - 600 / 1800) < 1e-9);
  assert.equal(segs[0].active, true);
  assert.ok(Math.abs(segs[0].fill - 0.5) < 1e-9);
  assert.equal(segs[1].fill, 0);
});

test("an overrunning segment fills to 1, never beyond", () => {
  const segs = segments(fresh(), sec(900));
  assert.equal(segs[0].fill, 1);
});

// ---------------------------------------------------------------------------
// Resuming
// ---------------------------------------------------------------------------

test("resuming opens the phase the server says we are on", () => {
  const s = createRuntime({
    sessionId: "s1", studyPlanId: "p1", childId: "c1", now: T0, currentPhase: 3,
  });
  assert.equal(s.currentPhase, 3);
  assert.equal(currentPhase(s)?.key, "practice");
  assert.equal(s.phases[2].startedAt, T0, "the resumed phase starts now");
});

test("resuming does NOT invent durations for the phases already done", () => {
  /**
   * The server holds the real timings from when those phases were
   * checkpointed. Fabricating them here would overwrite the truth with a guess
   * on every resume — and a session resumed three times would report three
   * different histories.
   */
  const s = createRuntime({
    sessionId: "s1", studyPlanId: "p1", childId: "c1", now: T0, currentPhase: 3,
  });
  assert.equal(s.phases[0].completed, true);
  assert.equal(s.phases[0].startedAt, null);
  assert.equal(elapsedSeconds(s, s.phases[0], sec(600)), 0);
});
