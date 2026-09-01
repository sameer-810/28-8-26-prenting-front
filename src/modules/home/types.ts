/**
 * The shapes the dashboard reads.
 *
 * Written from the API's `dashboard.service.js`, not from what the screen
 * wishes they were — see the note on `dailyCard.accuracy`, which is exactly the
 * kind of field a type can quietly lie about.
 */

export interface ChildCard {
  id: string;
  name: string;
  grade: number;
  avatarUrl: string;
  studiedToday: boolean;
  today: {
    sessions: number;
    minutesStudied: number;
    attempted: number;
    correct: number;
    accuracy: number;
  };
  streak: { current: number; longest: number; graceRemaining: number };
  fluency: {
    rated: boolean;
    band: string;
    label: string;
    score: number;
    sessionsToRate: number;
  };
  last30Days: { sessions: number; minutesStudied: number; activeDays: number };
  /**
   * `accuracy` is 0–1, or null on an older payload.
   *
   * The card's TONE follows it. Without this field the home screen rendered
   * every evening in the celebration accent, including one where a child got
   * nothing right — a store screenshot caught it framing "0 of 8 correct" with
   * a sparkle. `null` is treated as "not a celebration" for the same reason.
   */
  dailyCard: { title: string; body: string; accuracy: number | null } | null;
  resumable: { sessionId: string; currentPhase: number } | null;
  readyPlans: { id: string; title: string; subject: string }[];
  suggestions: {
    id: string | null;
    title: string;
    chapter: string;
    subject: string;
  }[];
}

export interface Dashboard {
  today: string;
  inStudyWindow: boolean;
  studyWindow: { startHour: number; endHour: number };
  usage: {
    sessionsUsed: number;
    sessionsLeft: number;
    scansUsed: number;
    scansLeft: number;
  };
  unseenMilestones: number;
  children: ChildCard[];
  isEmpty: boolean;
}
