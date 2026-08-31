import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import type { QueryClient } from "@tanstack/react-query";
import { environment } from "@config/env";
import { apiClient } from "../api/apiClient";
import { useOfflineStore } from "./useOfflineStore";

/**
 * The device outbox — the client half of the PRD's offline continuity promise.
 *
 * A running 30-minute session must survive losing the network. The plan is
 * already cached on the device when the session starts, so the countdown, the
 * questions and the grading all work locally. What cannot work locally is
 * *telling the server* — so checkpoints, answers and completion are queued here
 * and drained when the network returns.
 *
 * Every operation this queues is idempotent server-side by construction: phase
 * checkpoints are no-ops on replay, answers are unique on
 * (session, phase, questionIndex), and completing an already-complete session
 * returns `alreadyComplete`. That is what makes a blind retry safe — the queue
 * does not need to know whether a request that timed out actually landed.
 */

const STORAGE_KEY = "parentai.outbox.v1";
/**
 * A queued operation is dropped after this long. A checkpoint from a session
 * three days ago has already been closed by the server's abandonment sweep, and
 * replaying it would be noise rather than repair.
 */
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export interface OutboxOp {
  id: string;
  method: "post" | "patch";
  url: string;
  body: unknown;
  createdAt: number;
  attempts: number;
  /** Queries to invalidate once this lands. */
  invalidate?: string[][];
}

let queue: OutboxOp[] = [];
let loaded = false;
let draining = false;
let queryClient: QueryClient | null = null;
let probeTimer: ReturnType<typeof setInterval> | null = null;

function newId() {
  const bytes = new Uint8Array(12);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function persist() {
  useOfflineStore.getState().setPendingCount(queue.length);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // A full disk must not break the session in progress. The queue stays in
    // memory and drains normally unless the app is killed first.
  }
}

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: OutboxOp[] = JSON.parse(raw);
      const cutoff = Date.now() - MAX_AGE_MS;
      queue = parsed.filter((op) => op.createdAt > cutoff);
    }
  } catch {
    queue = [];
  }
  useOfflineStore.getState().setPendingCount(queue.length);
}

/**
 * Queues an operation and tries to send it immediately.
 *
 * The caller does NOT await the send — the session player must advance the
 * moment the parent taps, not when the server acknowledges. That is the whole
 * point: the UI is driven by local state and the network catches up.
 */
export async function enqueue(op: Omit<OutboxOp, "id" | "createdAt" | "attempts">) {
  await load();
  queue.push({ ...op, id: newId(), createdAt: Date.now(), attempts: 0 });
  await persist();
  void drain();
}

/**
 * Sends what it can, oldest first, and STOPS at the first network failure.
 *
 * Stopping matters: the operations are ordered (a checkpoint before the answers
 * that follow it), and continuing past a failure would deliver them out of
 * sequence. A 4xx is different — that operation will never succeed, so it is
 * dropped and the drain continues.
 */
export async function drain(): Promise<void> {
  if (draining) return;
  await load();
  if (!queue.length) return;

  draining = true;
  useOfflineStore.getState().setSyncing(true);
  const landed: string[][] = [];

  try {
    while (queue.length) {
      const op = queue[0];
      try {
        await apiClient.request({ method: op.method, url: op.url, data: op.body });
        queue.shift();
        if (op.invalidate) landed.push(...op.invalidate);
        await persist();
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;

        if (status && status >= 400 && status < 500 && status !== 429) {
          /**
           * A 4xx is our request being permanently wrong — a session the server
           * has since abandoned, a plan that was regenerated. Retrying forever
           * would wedge the queue behind an operation that can never succeed,
           * blocking everything queued after it. Drop it and move on.
           */
          queue.shift();
          await persist();
          continue;
        }

        // Network, 5xx or 429: keep it, keep the order, try again later.
        op.attempts += 1;
        if (op.attempts >= MAX_ATTEMPTS) {
          queue.shift();
        }
        await persist();
        break;
      }
    }
  } finally {
    draining = false;
    useOfflineStore.getState().setSyncing(false);
    if (!queue.length) useOfflineStore.getState().markSynced();
  }

  // Refresh whatever the delivered writes changed.
  if (queryClient && landed.length) {
    const seen = new Set<string>();
    for (const key of landed) {
      const s = JSON.stringify(key);
      if (seen.has(s)) continue;
      seen.add(s);
      queryClient.invalidateQueries({ queryKey: key });
    }
  }
}

/**
 * The idle-case connectivity probe.
 *
 * Traffic tells us we are online; nothing tells us we are back unless something
 * is being requested. A cheap /health poll — only while we believe we are
 * offline, and only every 15 seconds — closes that gap without adding
 * background load in the normal case.
 */
async function probe() {
  const { isOnline } = useOfflineStore.getState();
  if (isOnline) {
    if (queue.length) void drain();
    return;
  }
  try {
    await axios.get(`${environment.socketUrl}/health`, { timeout: 4000 });
    useOfflineStore.getState().setOnline(true);
    void drain();
  } catch {
    // Still offline. Nothing to do but wait.
  }
}

export function startOfflineEngine(client: QueryClient) {
  queryClient = client;
  void load().then(() => drain());

  if (probeTimer) clearInterval(probeTimer);
  probeTimer = setInterval(probe, 15000);

  /**
   * The browser's own events are used as a HINT, not as truth: `online` firing
   * is a good moment to try a drain, while `offline` only lowers confidence
   * enough to start probing. The probe decides.
   */
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("online", () => {
      useOfflineStore.getState().setOnline(true);
      void drain();
    });
    window.addEventListener("offline", () => useOfflineStore.getState().setOnline(false));
  }
}

export function stopOfflineEngine() {
  if (probeTimer) clearInterval(probeTimer);
  probeTimer = null;
}

/** For the sync screen and for tests. */
export function pendingOps(): OutboxOp[] {
  return [...queue];
}

export async function clearOutbox() {
  queue = [];
  await persist();
}
