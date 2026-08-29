import { create } from "zustand";

/**
 * Connectivity, inferred from real traffic rather than asked of the platform.
 *
 * WHY NOT `navigator.onLine` / NetInfo
 * ------------------------------------
 * Both answer "is an interface up", which is a different question from "can I
 * reach the API". A phone on hotel wifi behind a captive portal is emphatically
 * "online" and can reach nothing; a phone that just completed a request is
 * demonstrably online whatever the flag says.
 *
 * So the API client marks this true on every completed round trip and false
 * only when a request produced NO response at all (see apiClient.ts). A
 * periodic /health probe covers the idle case, where nothing is being requested
 * and the app would otherwise never notice the network coming back.
 */

interface OfflineState {
  isOnline: boolean;
  /** Set while the outbox is draining, so the banner can say so. */
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;

  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setPendingCount: (count: number) => void;
  markSynced: () => void;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  /**
   * Starts optimistic. Assuming offline until proven otherwise would show every
   * user an offline banner on launch, before the first request has had a chance
   * to disprove it.
   */
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncedAt: null,

  setOnline: (online) => {
    if (get().isOnline === online) return; // Avoid a re-render per request.
    set({ isOnline: online });
  },
  setSyncing: (isSyncing) => set({ isSyncing }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  markSynced: () => set({ lastSyncedAt: Date.now(), isSyncing: false }),
}));
