import { useQuery } from "@tanstack/react-query";
import { progressApi } from "../api/progressApi";
import type { Timeline } from "../types";

/**
 * Query keys for the progress screens, in one place.
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS. These were raw arrays written out at
 * each call site — `["timeline", childId, timeline]` here, `["streak", id]`
 * there — and a key built in one screen is invalidated from another. A typo, or
 * an argument added on one side only, makes the invalidation silently match
 * nothing: the mutation succeeds, the screen keeps showing the old number, and
 * there is no error anywhere to notice.
 */
export const progressKeys = {
  all: ["progress"] as const,
  timeline: (childId?: string, range?: Timeline) =>
    [...progressKeys.all, "timeline", childId, range] as const,
  streak: (childId?: string) => [...progressKeys.all, "streak", childId] as const,
  proof: (childId?: string, range?: Timeline) =>
    [...progressKeys.all, "proof", childId, range] as const,
  subjects: (childId?: string, from?: string, to?: string) =>
    [...progressKeys.all, "subjects", childId, from, to] as const,
  mastery: (childId?: string, from?: string, to?: string) =>
    [...progressKeys.all, "mastery", childId, from, to] as const,
};

export function useTimeline(childId: string | undefined, range: Timeline) {
  return useQuery({
    queryKey: progressKeys.timeline(childId, range),
    queryFn: () => progressApi.timeline(childId!, range),
    enabled: Boolean(childId),
    /**
     * No retry. A refused timeline is usually the PLAN GATE — a trial family
     * asking for the monthly view — and retrying a 403 three times just delays
     * the explanation the screen is ready to show.
     */
    retry: false,
  });
}

export function useStreak(childId: string | undefined) {
  return useQuery({
    queryKey: progressKeys.streak(childId),
    queryFn: () => progressApi.streak(childId!),
    enabled: Boolean(childId),
  });
}

/**
 * Proof of Progress compares one period against the one before it, so it is
 * only fetched on ranges where that comparison means something. Asking for a
 * month-over-month figure while looking at today would render a card about a
 * period the parent is not looking at.
 */
export function useProofOfProgress(
  childId: string | undefined,
  range: Timeline,
  window: { from?: string; to?: string } | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: progressKeys.proof(childId, range),
    queryFn: () => progressApi.proofOfProgress(childId!, { from: window?.from, to: window?.to }),
    enabled: Boolean(childId) && Boolean(window) && enabled,
    retry: false,
  });
}

export function useSubjects(
  childId: string | undefined,
  window: { from?: string; to?: string } | undefined,
) {
  return useQuery({
    queryKey: progressKeys.subjects(childId, window?.from, window?.to),
    queryFn: () => progressApi.subjects(childId!, { from: window?.from, to: window?.to }),
    enabled: Boolean(childId) && Boolean(window),
  });
}

export function useMastery(
  childId: string | undefined,
  window: { from?: string; to?: string } | undefined,
) {
  return useQuery({
    queryKey: progressKeys.mastery(childId, window?.from, window?.to),
    queryFn: () => progressApi.mastery(childId!, { from: window?.from, to: window?.to }),
    enabled: Boolean(childId) && Boolean(window),
  });
}
