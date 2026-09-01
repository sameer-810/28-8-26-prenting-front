import { Platform } from "react-native";
/**
 * SDK 56's file API is the `File` / `Directory` / `Paths` classes; the old
 * `FileSystem.downloadAsync` and `FileSystem.cacheDirectory` are gone. Named
 * imports rather than a namespace so a future rename fails at build time
 * instead of at runtime on a device.
 */
import { File, Paths } from "expo-file-system";
import { apiClient, unwrap } from "@api/apiClient";
import { environment } from "@config/env";
import { saveOnWeb, shareOrExplain } from "@shared/download";
import { useAuthStore } from "@shared/store/useAuthStore";
import type {
  Timeline,
  TimelineResult,
  ProofOfProgress,
  YearlyReport,
} from "../types";

export const progressApi = {
  async timeline(
    childId: string,
    timeline: Timeline,
    range?: { from?: string; to?: string },
  ) {
    const qs = new URLSearchParams();
    if (range?.from) qs.set("from", range.from);
    if (range?.to) qs.set("to", range.to);
    const suffix = qs.toString() ? `?${qs}` : "";
    return unwrap<TimelineResult>(
      apiClient.get(`/analytics/${childId}/${timeline}${suffix}`),
    );
  },

  async proofOfProgress(
    childId: string,
    range?: { from?: string; to?: string },
  ) {
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

export const reportsApi = {
  async yearly(childId: string, year?: number) {
    const qs = year ? `?year=${year}` : "";
    return unwrap<YearlyReport>(
      apiClient.get(`/reports/${childId}/yearly${qs}`),
    );
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
 * `<a href>` and `Linking.openURL` cannot work — a browser navigation carries
 * no `Authorization` header — so the bytes are fetched by the client holding
 * the token, then handed to the platform (see @shared/download).
 */
export async function downloadReport(
  path: string,
  filename: string,
): Promise<{ ok: boolean; reason?: string }> {
  const token = useAuthStore.getState().token;
  const url = `${environment.apiUrl}${path}`;

  try {
    if (Platform.OS === "web") {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok)
        return { ok: false, reason: `The server returned ${res.status}` };
      saveOnWeb(await res.blob(), filename);
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

    return await shareOrExplain(
      downloaded.uri,
      "application/pdf",
      filename,
      "com.adobe.pdf",
    );
  } catch (err) {
    return {
      ok: false,
      reason: (err as Error)?.message || "The download failed",
    };
  }
}

/** Re-exported for existing imports; the shapes live in `../types`. */
export type {
  Timeline,
  FluencyResult,
  TimelineResult,
  ProofOfProgress,
  YearlyReport,
} from "../types";
