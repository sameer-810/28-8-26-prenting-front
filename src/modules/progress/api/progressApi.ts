import { Platform } from "react-native";
import * as Sharing from "expo-sharing";
/**
 * SDK 56's file API is the `File` / `Directory` / `Paths` classes; the old
 * `FileSystem.downloadAsync` and `FileSystem.cacheDirectory` are gone. Named
 * imports rather than a namespace so a future rename fails at build time
 * instead of at runtime on a device.
 */
import { File, Paths } from "expo-file-system";
import { apiClient, unwrap } from "@api/apiClient";
import { environment } from "@config/env";
import { useAuthStore } from "@shared/store/useAuthStore";

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

export const progressApi = {
  async timeline(childId: string, timeline: Timeline, range?: { from?: string; to?: string }) {
    const qs = new URLSearchParams();
    if (range?.from) qs.set("from", range.from);
    if (range?.to) qs.set("to", range.to);
    const suffix = qs.toString() ? `?${qs}` : "";
    return unwrap<TimelineResult>(apiClient.get(`/analytics/${childId}/${timeline}${suffix}`));
  },

  async proofOfProgress(childId: string, range?: { from?: string; to?: string }) {
    const qs = new URLSearchParams();
    if (range?.from) qs.set("from", range.from);
    if (range?.to) qs.set("to", range.to);
    const suffix = qs.toString() ? `?${qs}` : "";
    return unwrap<ProofOfProgress>(
      apiClient.get(`/analytics/${childId}/proof-of-progress${suffix}`),
    );
  },

  async subjects(childId: string, range?: { from?: string; to?: string }) {
    const qs = new URLSearchParams();
    if (range?.from) qs.set("from", range.from);
    if (range?.to) qs.set("to", range.to);
    const suffix = qs.toString() ? `?${qs}` : "";
    return unwrap<
      {
        subject: string;
        attempted: number;
        correct: number;
        accuracy: number;
        minutesStudied: number;
        sessions: number;
      }[]
    >(apiClient.get(`/analytics/${childId}/subjects${suffix}`));
  },

  async mastery(childId: string, range?: { from?: string; to?: string }) {
    const qs = new URLSearchParams();
    if (range?.from) qs.set("from", range.from);
    if (range?.to) qs.set("to", range.to);
    const suffix = qs.toString() ? `?${qs}` : "";
    return unwrap<{
      topics: {
        topicId: string | null;
        title: string;
        subject: string;
        attempted: number;
        correct: number;
        accuracy: number;
        daysMastered: number;
      }[];
      skills: {
        skill: string;
        subject: string;
        attempted: number;
        correct: number;
        accuracy: number;
        avgAnswerMs: number;
        speedRatio: number;
      }[];
    }>(apiClient.get(`/analytics/${childId}/mastery${suffix}`));
  },

  async streak(childId: string) {
    return unwrap<{
      current: number;
      longest: number;
      lastActiveDay: string | null;
      startedOn: string | null;
      graceRemaining: number;
      nextMilestone: number | null;
    }>(apiClient.get(`/analytics/${childId}/streak`));
  },

  async milestones(params: { childId?: string; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.childId) qs.set("childId", params.childId);
    qs.set("limit", String(params.limit ?? 40));
    return unwrap<
      {
        id: string;
        childId: string;
        kind: string;
        title: string;
        body: string;
        icon: string;
        meta: Record<string, unknown>;
        dayKey: string;
        seen: boolean;
        createdAt: string;
      }[]
    >(apiClient.get(`/milestones?${qs}`));
  },

  async markMilestonesSeen(childId?: string) {
    return unwrap<{ message: string }>(
      apiClient.post("/milestones/seen", { all: true, childId }),
    );
  },
};

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

export const reportsApi = {
  async yearly(childId: string, year?: number) {
    const qs = year ? `?year=${year}` : "";
    return unwrap<YearlyReport>(apiClient.get(`/reports/${childId}/yearly${qs}`));
  },

  async certificate(childId: string, year?: number) {
    const qs = year ? `?year=${year}` : "";
    return unwrap<YearlyReport>(
      apiClient.get(`/reports/${childId}/readiness-certificate${qs}`),
    );
  },
};

/**
 * Downloads a PDF the API only serves to an authenticated caller.
 *
 * WHY THIS IS NOT JUST A LINK
 * ---------------------------
 * The obvious `<a href>` or `Linking.openURL` cannot work: a browser navigation
 * carries no `Authorization` header, so the request arrives unauthenticated and
 * the API — correctly — refuses it. The bytes have to be fetched by the client
 * that holds the token, then handed to the platform.
 *
 * On the web that means an object URL and a synthetic click; on native, writing
 * to the app's own directory and opening the share sheet. Both are wrapped so a
 * caller just says "save this report".
 */
export async function downloadReport(
  path: string,
  filename: string,
): Promise<{ ok: boolean; reason?: string }> {
  const token = useAuthStore.getState().token;
  const url = `${environment.apiUrl}${path}`;

  try {
    if (Platform.OS === "web") {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return { ok: false, reason: `The server returned ${res.status}` };
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoked on the next tick: revoking immediately can cancel the download
      // in some browsers before it has read the blob.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      return { ok: true };
    }

    /**
     * Downloaded into the CACHE directory, not documents. A report is a
     * throwaway artefact on its way to the share sheet — writing it somewhere
     * permanent would accumulate a PDF per tap in the app's own storage, which
     * the parent has no way to clear.
     */
    const target = new File(Paths.cache, filename);
    const downloaded = await File.downloadFileAsync(url, target, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(downloaded.uri, {
        mimeType: "application/pdf",
        dialogTitle: filename,
        UTI: "com.adobe.pdf",
      });
      return { ok: true };
    }
    // Saved but with nowhere to send it — worth saying rather than claiming
    // success the parent cannot see.
    return { ok: false, reason: "Saved to this device, but sharing isn't available here." };
  } catch (err) {
    return { ok: false, reason: (err as Error)?.message || "The download failed" };
  }
}
