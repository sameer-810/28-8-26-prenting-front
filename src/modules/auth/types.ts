import type { Parent, Family } from "@shared/store/useAuthStore";
import type { LanguageCode } from "@shared/fonts";

/**
 * The shapes the auth and onboarding flows read.
 *
 * A child is a PROFILE inside a household, never an account — no email, no
 * password, nothing they could be contacted through. That is the product's
 * first decision (spec DECISION 1) and it is visible right here in the type.
 */

export interface SessionPayload {
  user: Parent;
  family: Family;
  accessToken: string;
  refreshToken: string;
}

export interface ChildProfile {
  id: string;
  familyId: string;
  name: string;
  dateOfBirth: string | null;
  avatarUrl: string;
  grade: number;
  board: string;
  boardName: string;
  schoolName: string;
  schoolMedium: LanguageCode;
  homeLanguage: LanguageCode;
  languages: {
    parent: {
      code: LanguageCode;
      label: string;
      script: string;
      direction: "ltr" | "rtl";
      fontFamily: string;
      lineHeightRatio: number;
    };
    child: {
      code: LanguageCode;
      label: string;
      script: string;
      direction: "ltr" | "rtl";
      fontFamily: string;
      lineHeightRatio: number;
    };
    isDualLanguage: boolean;
  };
  subjects: string[];
  streak: { current: number; longest: number; lastSessionDay: string | null };
  totals: { sessions: number; minutesStudied: number };
  fluency: { band: string; label: string; score: number };
  isActive: boolean;
  createdAt: string;
}

export interface ReferenceData {
  boards: {
    code: string;
    name: string;
    fullName: string;
    scope: string;
    state: string | null;
    defaultMedium: string;
    regionalLanguage: string;
  }[];
  languages: {
    code: LanguageCode;
    name: string;
    endonym: string;
    script: string;
    direction: "ltr" | "rtl";
    fontFamily: string;
    lineHeightRatio: number;
  }[];
  grades: { value: number; label: string }[];
  subjects: { code: string; label: string }[];
  plans: {
    code: string;
    name: string;
    badge: string | null;
    priceInPaise: number;
    priceLabel: string;
    interval: string;
    intervalLabel: string;
    maxChildren: number;
    features: string[];
  }[];
}
