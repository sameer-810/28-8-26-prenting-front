/**
 * The shapes the progress screens read.
 *
 * `TimelineResult.series` arrives DENSE — one entry per day in the window,
 * including days with nothing on them. A chart plotted only from days that
 * exist compresses a fortnight's gap into a neighbouring bar and makes a
 * lapsed month look continuous, which is the opposite of what a progress view
 * is for.
 */

export type Timeline = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export interface FluencyResult {
  rated: boolean;
  band: string;
  label: string;
  score: number;
  sessionsToRate: number;
  components: { accuracy: number; speed: number; consistency: number };
}

export interface TimelineResult {
  timeline: Timeline;
  from: string;
  to: string;
  windowDays: number;
  totals: {
    sessions: number;
    completedSessions: number;
    abandonedSessions: number;
    attempted: number;
    correct: number;
    skipped: number;
    minutesStudied: number;
    hoursStudied: number;
    activeDays: number;
    accuracy: number;
    timerAdherence: number;
    topicsMastered: number;
    perfectSessions: number;
  };
  fluency: FluencyResult;
  series: {
    dayKey: string;
    sessions: number;
    attempted: number;
    correct: number;
    accuracy: number;
    minutesStudied: number;
    adherence: number;
  }[];
}

export interface ProofOfProgress {
  windowDays: number;
  before: FluencyResult & { from: string; to: string };
  after: FluencyResult & { from: string; to: string };
  comparison: {
    scoreDelta: number;
    bandsGained: number;
    accuracyDelta: number;
    speedDelta: number;
    improved: boolean;
  };
}

export interface YearlyReport {
  child: { id: string; name: string; grade: number; board: string; school: string };
  year: number;
  period: { from: string; to: string; days: number };
  totals: {
    sessions: number;
    activeDays: number;
    minutesStudied: number;
    hoursStudied: number;
    attempted: number;
    correct: number;
    accuracy: number;
    perfectSessions: number;
  };
  fluency: FluencyResult;
  progress: ProofOfProgress["comparison"] & {
    before: FluencyResult;
    after: FluencyResult;
  };
  subjects: {
    subject: string;
    attempted: number;
    correct: number;
    accuracy: number;
    hoursStudied: number;
    sessions: number;
  }[];
  topicsMastered: { title: string; subject: string }[];
  strengths: string[];
  worthRevisiting: string[];
  coverage: {
    totalTopics: number;
    topicsTouched: number;
    topicsMastered: number;
    touchedPct: number;
    masteredPct: number;
  };
  certificate?: {
    serial: string;
    issuedOn: string;
    verdict: "ready" | "developing" | "in_progress";
    statement: string;
    nextGrade: number;
    scope: string;
  };
}
