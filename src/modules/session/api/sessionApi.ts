import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient, unwrap } from "@api/apiClient";
import { enqueue } from "@shared/offline/outboxEngine";
import type { LanguageCode } from "@shared/fonts";
import type { Question } from "../grading";

export interface PlanLanguage {
  code: LanguageCode;
  label: string;
  direction: "ltr" | "rtl";
  fontFamily: string;
  lineHeightRatio: number;
}

export interface StudyPlan {
  id: string;
  childId: string;
  status: "generating" | "parent_ready" | "ready" | "failed";
  runnable: boolean;
  grounding: "curriculum" | "material" | "freeform";
  topic: {
    id: string | null;
    title: string;
    titleParent: string;
    chapter: string;
    subject: string;
    difficulty: number;
  };
  languages: { parent: PlanLanguage; child: PlanLanguage; isDual: boolean };
  phases: {
    index: number;
    key: string;
    title: string;
    seconds: number;
    audience: "parent" | "child";
    objective: string;
    ready: boolean;
  }[];
  totalSeconds: number;
  concept: {
    script: string;
    analogies: string[];
    summary: string[];
    commonMistake: string;
  };
  teaching: {
    workedExample: string;
    steps: string[];
    dialoguePrompts: string[];
    checkForUnderstanding: string;
  };
  practice: (Question & { index: number })[];
  mock: (Question & { index: number })[];
  revision: {
    focus: string;
    clarifications: { questionPrompt: string; whyWrong: string; reteach: string }[];
    encouragement: string;
  } | null;
  degraded: boolean;
  degradedReason: string;
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  childId: string;
  studyPlanId: string;
  status: "active" | "completed" | "abandoned";
  currentPhase: number;
  currentPhaseKey: string;
  phases: {
    index: number;
    key: string;
    title: string;
    plannedSeconds: number;
    actualSeconds: number;
    completed: boolean;
  }[];
  progress: { elapsedPlannedSeconds: number; totalSeconds: number; fraction: number };
  startedAt: string;
  minutesStudied: number;
  timerAdherence: number;
  score: {
    total: number;
    attempted: number;
    correct: number;
    skipped: number;
    accuracy: number;
    avgAnswerMs: number;
  };
  perfect: boolean;
}

export interface CompletionResult {
  session: SessionRecord;
  alreadyComplete: boolean;
  streak: { current: number; longest: number; extended: boolean; isNewRecord: boolean } | null;
  fluency: { rated: boolean; band: string; label: string; score: number } | null;
  milestones: { id: string; kind: string; title: string; body: string; icon: string }[];
}

/**
 * The offline plan cache.
 *
 * When a session starts, the whole plan is written to device storage. That is
 * what makes the PRD's offline guarantee real: the countdown, the questions,
 * the grading and the phase transitions all run from this copy, and the network
 * is needed only to report what happened.
 */
const PLAN_KEY = (sessionId: string) => `parentai.session.${sessionId}`;

export async function cachePlan(sessionId: string, plan: StudyPlan) {
  try {
    await AsyncStorage.setItem(PLAN_KEY(sessionId), JSON.stringify(plan));
  } catch {
    // A full disk must not stop the session starting. It simply will not
    // survive a cold restart, which is a lesser failure than not beginning.
  }
}

export async function cachedPlan(sessionId: string): Promise<StudyPlan | null> {
  try {
    const raw = await AsyncStorage.getItem(PLAN_KEY(sessionId));
    return raw ? (JSON.parse(raw) as StudyPlan) : null;
  } catch {
    return null;
  }
}

export async function clearCachedPlan(sessionId: string) {
  try {
    await AsyncStorage.removeItem(PLAN_KEY(sessionId));
  } catch {
    /* nothing to do */
  }
}

/** A device-generated idempotency key for anything the outbox may replay. */
export function clientOpId(): string {
  const bytes = new Uint8Array(12);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const planApi = {
  async get(planId: string) {
    return unwrap<StudyPlan>(apiClient.get(`/study-plans/${planId}`));
  },

  async generate(input: {
    childId: string;
    intentText?: string;
    subject?: string;
    topicId?: string;
    materialIds?: string[];
    force?: boolean;
  }) {
    return unwrap<StudyPlan>(
      apiClient.post("/study-plans", { ...input, clientOpId: clientOpId() }),
    );
  },

  async regenerate(planId: string) {
    return unwrap<StudyPlan>(apiClient.post(`/study-plans/${planId}/regenerate`));
  },
};

export const sessionApi = {
  async start(input: { studyPlanId: string; childId: string }) {
    const res = await unwrap<{ session: SessionRecord; plan: StudyPlan }>(
      apiClient.post("/sessions", { ...input, clientOpId: clientOpId() }),
    );
    // Cache before returning: the caller navigates straight into the player,
    // and the plan must already be on the device by then.
    await cachePlan(res.session.id, res.plan);
    return res;
  },

  async get(sessionId: string) {
    return unwrap<{ session: SessionRecord; plan: StudyPlan }>(
      apiClient.get(`/sessions/${sessionId}`),
    );
  },

  /**
   * The three replayable writes go through the OUTBOX, never straight to the
   * network.
   *
   * Each is idempotent server-side by construction — checkpoints are no-ops on
   * replay, answers are unique on (session, phase, index), and completing twice
   * returns `alreadyComplete` — so a blind retry is safe and the UI never waits
   * on the server to advance.
   */
  async checkpoint(sessionId: string, phaseIndex: number, actualSeconds: number) {
    await enqueue({
      method: "patch",
      url: `/sessions/${sessionId}/checkpoint`,
      body: { phaseIndex, actualSeconds, clientOpId: clientOpId() },
      invalidate: [["dashboard"]],
    });
  },

  async submitAnswers(
    sessionId: string,
    answers: { phase: "practice" | "mock"; questionIndex: number; given: string; answerMs: number }[],
  ) {
    await enqueue({
      method: "post",
      url: `/sessions/${sessionId}/attempts`,
      body: { answers: answers.map((a) => ({ ...a, clientOpId: clientOpId() })) },
      invalidate: [["dashboard"]],
    });
  },

  /**
   * Completion is the one write that is AWAITED when online, because its
   * response carries the celebration — the streak, the new fluency band, the
   * milestone cards. Offline it falls back to the outbox and the app shows a
   * locally-computed summary instead.
   */
  async complete(sessionId: string): Promise<CompletionResult | null> {
    try {
      return await unwrap<CompletionResult>(
        apiClient.post(`/sessions/${sessionId}/complete`, { clientOpId: clientOpId() }),
      );
    } catch {
      await enqueue({
        method: "post",
        url: `/sessions/${sessionId}/complete`,
        body: { clientOpId: clientOpId() },
        invalidate: [["dashboard"], ["me"]],
      });
      return null;
    }
  },

  async revision(sessionId: string) {
    return unwrap<{
      revision: StudyPlan["revision"];
      missedCount: number;
      perfect: boolean;
      degraded: boolean;
    }>(apiClient.post(`/sessions/${sessionId}/revision`));
  },

  async abandon(sessionId: string) {
    return unwrap<SessionRecord>(apiClient.post(`/sessions/${sessionId}/abandon`));
  },
};

export const captureApi = {
  /** Free speech or text → structured intent. Soft-fails by design. */
  async parseIntent(text: string, childId?: string) {
    return unwrap<{
      understood: boolean;
      subject?: string;
      topic?: string;
      chapter?: string;
      urgency?: string;
      confidence?: number;
      reason?: string;
    }>(apiClient.post("/materials/intent", { text, childId }));
  },

  /**
   * Uploads photographed pages.
   *
   * Multipart, and deliberately NOT routed through the outbox: OCR needs the
   * bytes and the server's answer, so there is nothing useful to queue. Offline
   * this fails and the capture screen says so.
   */
  async uploadPages(input: { childId?: string; kind?: string; files: { uri: string; name: string; type: string }[] }) {
    const form = new FormData();
    if (input.childId) form.append("childId", input.childId);
    if (input.kind) form.append("kind", input.kind);
    form.append("clientOpId", clientOpId());
    for (const f of input.files) {
      form.append("images", f as unknown as Blob);
    }
    return unwrap<{
      id: string;
      extractedText: string;
      subject: string;
      chapter: string;
      topics: string[];
      questionsFound: string[];
      confidence: number;
      status: string;
      needsRetake: boolean;
    }>(
      apiClient.post("/materials", form, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    );
  },

  async chapters(board: string, grade: number, subject: string) {
    return unwrap<
      { chapter: string; topics: { id: string; topic: string; difficulty: number }[] }[]
    >(apiClient.get(`/curriculum/chapters?board=${board}&grade=${grade}&subject=${subject}`));
  },
};
