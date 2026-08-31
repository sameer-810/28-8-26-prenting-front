import { apiClient, unwrap } from "@api/apiClient";

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
   * `accuracy` is 0–1, or null on an older payload. The card's tone follows it
   * — see HomeScreen, where celebrating a session the child got wrong was a
   * real bug rather than a hypothetical one.
   */
  dailyCard: { title: string; body: string; accuracy: number | null } | null;
  resumable: { sessionId: string; currentPhase: number } | null;
  readyPlans: { id: string; title: string; subject: string }[];
  suggestions: { id: string | null; title: string; chapter: string; subject: string }[];
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

export const dashboardApi = {
  async get() {
    return unwrap<Dashboard>(apiClient.get("/dashboard"));
  },
};
