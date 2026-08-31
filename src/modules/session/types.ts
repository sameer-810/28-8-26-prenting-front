import type { LanguageCode } from "@shared/fonts";
import type { Question } from "./grading";

/**
 * The shapes the session player reads.
 *
 * A plan carries BOTH languages: the parent's script and the child's questions
 * are generated separately rather than translated from one another, so they are
 * separate fields all the way down.
 */

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
