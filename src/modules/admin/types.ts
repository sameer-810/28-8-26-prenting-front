/**
 * The shapes the platform console reads.
 *
 * Written from the API's actual responses (`admin.service.js` /
 * `admin.controller.js`), not from what the screens wish they were. The
 * distinction is not pedantic: `familyDetail` returns raw `calls` and `degraded`
 * counts while `overview` returns a pre-computed `degradedPct`, and a type that
 * smoothed that over would let a screen read `degradedPct` off the wrong payload
 * and render a confident "0%" over a household whose every plan had fallen back.
 */

export interface ListMeta {
  total: number;
  pages: number;
  page: number;
}

/** One row of the AI ledger, aggregated per operation over the last 7 days. */
export interface AiOperationStat {
  operation:
    | "concept"
    | "session_body"
    | "revision"
    | "extraction"
    | "intent"
    | "moderation"
    | string;
  calls: number;
  outputTokens: number;
  avgLatencyMs: number;
  degraded: number;
  /** Present on the overview only — see the note at the top of this file. */
  degradedPct: number;
}

export interface AdminOverview {
  families: { total: number; active: number; byPlan: Record<string, number> };
  children: number;
  parents: number;
  sessions: { today: number; last7Days: number };
  ai: AiOperationStat[];
  /**
   * What the current plans are WORTH per month, not cash received. The screens
   * label it that way too — a founder reading this as revenue would be reading
   * it wrong, and the name alone does not stop that.
   */
  entitledMrrInPaise: number;
}

export interface AdminFamilyRow {
  id: string;
  name: string;
  homeLanguage: string;
  isActive: boolean;
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  createdAt: string;
}

export type SubscriptionStatus =
  "trialing" | "active" | "past_due" | "cancelled" | "expired";

export type PlanCode =
  "trial" | "basic_monthly" | "family_annual" | "family_plus";

export interface AdminFamilyDetail {
  family: {
    id: string;
    name: string;
    homeLanguage: string;
    isActive: boolean;
    createdAt: string;
    subscription: {
      planCode: PlanCode;
      status: SubscriptionStatus;
      currentPeriodEnd: string | null;
    };
    plan: { name: string; maxChildren: number; sessionsPerDay: number };
    consent: {
      accepted: boolean;
      acceptedAt: string | null;
      policyVersion: string;
    };
  };
  parents: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
  }[];
  /**
   * Names, grades and progress — and nothing else. The API deliberately returns
   * no session content, no generated script and no child's answers, so this type
   * has nowhere to put them even if a screen asked. Support access is not a
   * licence to read a minor's schoolwork.
   */
  children: {
    id: string;
    name: string;
    grade: number;
    board: string;
    streak: number;
    totalSessions: number;
    fluencyBand: string;
  }[];
  usage: {
    completedSessions: number;
    plansGenerated: number;
    lastSessionAt: string | null;
    ai: { calls: number; outputTokens: number; degraded: number };
  };
}

export interface CurriculumCoverageRow {
  board: string;
  grade: number;
  subject: string;
  topics: number;
  chapters: number;
}

export interface PlatformAdminRow {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "support";
  isActive: boolean;
  lastLoginAt: string | null;
}
