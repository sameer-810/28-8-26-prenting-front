import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { decode } from "base-64";
import axios from "axios";
import { environment } from "@config/env";
import { deviceContext } from "../api/deviceId";
import type { LanguageCode } from "../fonts";

// Some React Native engines lack `atob`, used for the base64 JWT decode below.
const runtimeGlobal = globalThis as unknown as { atob?: typeof decode };
if (!runtimeGlobal.atob) runtimeGlobal.atob = decode;

export type Role = "owner" | "guardian";

export interface Parent {
  id: string;
  familyId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  role: Role;
  permissions: string[];
  preferredLanguage: LanguageCode;
  isActive: boolean;
}

export interface Family {
  id: string;
  name: string;
  homeLanguage: LanguageCode;
  homeLanguageLabel: string;
  timezone: string;
  studyWindow: { startHour: number; endHour: number };
  notifications: {
    studyReminder: boolean;
    reminderHour: number;
    weeklySummary: boolean;
    milestoneAlerts: boolean;
    productEmails: boolean;
  };
  consent: { accepted: boolean; acceptedAt: string | null; policyVersion: string };
  subscription: {
    planCode: string;
    planName: string;
    status: string;
    interval: string;
    priceInPaise: number;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    cancelledAt: string | null;
  };
  limits: {
    maxChildren: number;
    sessionsPerDay: number;
    scansPerDay: number;
    maxDevices: number;
    priorityQueue: boolean;
    timelines: string[];
  };
  usage?: {
    dayKey: string;
    sessionsUsed: number;
    sessionsLeft: number;
    scansUsed: number;
    scansLeft: number;
  };
}

interface AuthState {
  user: Parent | null;
  family: Family | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isAuthChecked: boolean;

  setAuth: (user: Parent, family: Family, token: string, refreshToken: string) => void;
  updateUser: (patch: Partial<Parent>) => void;
  updateFamily: (patch: Partial<Family>) => void;
  updateTokens: (token: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  hasPermission: (permission: string) => boolean;
  isOwner: () => boolean;
  /** The household's language, which is what the parent reads scripts in. */
  homeLanguage: () => LanguageCode;
}

export const isTokenExpired = (token: string | null) => {
  if (!token) return true;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const { exp } = JSON.parse(json);
    return exp * 1000 < Date.now() + 30000; // 30s buffer
  } catch {
    return true;
  }
};

/**
 * SecureStore on native, localStorage on the web.
 *
 * SecureStore has a ~2KB per-value limit, which the session payload sits well
 * inside — but it is why the persisted slice below is deliberately narrow
 * (`partialize`) rather than the whole store.
 */
const secureStorage: StateStorage = {
  getItem: async (name) => {
    if (Platform.OS === "web") return localStorage.getItem(name);
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name, value) => {
    if (Platform.OS === "web") localStorage.setItem(name, value);
    else await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    if (Platform.OS === "web") localStorage.removeItem(name);
    else await SecureStore.deleteItemAsync(name);
  },
};

/** One in-flight refresh, shared: a burst of 401s must not rotate five times. */
let refreshPromise: Promise<string | null> | null = null;
const STORAGE_KEY = "parentai-auth";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      family: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrated: false,
      isAuthChecked: false,

      setAuth: (user, family, token, refreshToken) =>
        set({ user, family, token, refreshToken, isAuthenticated: true }),

      updateUser: (patch) =>
        set((s) => ({ user: s.user ? { ...s.user, ...patch } : null })),

      updateFamily: (patch) =>
        set((s) => ({ family: s.family ? { ...s.family, ...patch } : null })),

      updateTokens: (token, refreshToken) =>
        set({ token, refreshToken, isAuthenticated: true }),

      logout: async () => {
        // Best-effort: tell the server to drop this device so its slot frees up
        // immediately. Local sign-out proceeds regardless.
        const { refreshToken } = get();
        if (refreshToken) {
          try {
            await axios.post(`${environment.apiUrl}/auth/logout`, { refreshToken });
          } catch {
            // The token's own TTL will reclaim the slot.
          }
        }
        await secureStorage.removeItem(STORAGE_KEY);
        set({
          user: null,
          family: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === "owner") return true;
        return user.permissions.includes(permission);
      },

      isOwner: () => get().user?.role === "owner",

      homeLanguage: () => get().family?.homeLanguage || get().user?.preferredLanguage || "en",

      refreshSession: async () => {
        if (refreshPromise) return refreshPromise;
        refreshPromise = (async () => {
          try {
            const { refreshToken, updateTokens, logout } = get();
            if (!refreshToken) {
              await logout();
              return null;
            }
            /**
             * A locally-expired refresh token is NOT judged here — the device
             * clock may be wrong, and during an outage the server never got to
             * rule on it. Send it anyway: online, an expired token comes back
             * 401 and the catch signs out; offline, the network error keeps the
             * session for the next attempt.
             */
            const device = await deviceContext();
            const res = await axios.post(`${environment.apiUrl}/auth/refresh`, {
              refreshToken,
              device,
            });
            const { accessToken, refreshToken: next } = res.data.data;
            updateTokens(accessToken, next);
            return accessToken;
          } catch (err) {
            /**
             * ONLY a 401/403 clears the session. A network error or a cold start
             * means the token was never judged, so it is kept for the next
             * attempt — every forced re-login also consumes a device slot.
             */
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 401 || status === 403) await get().logout();
            return null;
          } finally {
            refreshPromise = null;
          }
        })();
        return refreshPromise;
      },

      initializeAuth: async () => {
        const { token, refreshToken, refreshSession } = get();
        if (!token && !refreshToken) {
          set({ isAuthChecked: true });
          return;
        }
        if (!isTokenExpired(token)) {
          set({ isAuthenticated: true, isAuthChecked: true });
          return;
        }
        if (refreshToken) {
          await refreshSession();
          /**
           * Offline grace. `refreshSession` clears the session only when the
           * server rejected it, so if credentials survived the attempt the
           * failure was the network — boot with the cached user so a restart
           * during a power cut lands back in the app rather than on a login
           * screen it cannot reach the server to pass. The next successful
           * request re-judges the session.
           */
          if (get().refreshToken) {
            set({ isAuthenticated: true, isAuthChecked: true });
            return;
          }
        }
        set({ isAuthChecked: true });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        family: state.family,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    },
  ),
);
