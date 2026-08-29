import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { isTokenExpired } from "./useAuthStore";

/**
 * The platform-admin session, kept entirely separate from the parent session in
 * `useAuthStore`.
 *
 * Different storage key, different token, different API namespace (`/admin`).
 * The server already treats these as two token spaces — admin tokens are signed
 * with `JWT_ADMIN_SECRET`, so a parent's token can never be mistaken for staff
 * access even if the two code paths were confused. Keeping the CLIENT sessions
 * apart finishes that: a parent and a staff member can be signed in side by side
 * in one browser without either store knowing the other exists, and signing out
 * of one does not touch the other.
 */

export interface PlatformAdmin {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "support";
}

interface AdminState {
  admin: PlatformAdmin | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isAuthChecked: boolean;

  setAuth: (admin: PlatformAdmin, token: string) => void;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  isSuperadmin: () => boolean;
}

/**
 * sessionStorage on web, SecureStore on native.
 *
 * NOT localStorage, unlike the parent store — and the difference is deliberate.
 * A parent staying signed in on the family tablet all week is the product
 * working. A staff token reaches every household on the platform and can change
 * what any of them pays, so it is scoped to the tab and dropped when the tab
 * closes. A reload still keeps it; a laptop left open in a café does not.
 *
 * A token an earlier build may have left in localStorage is PURGED rather than
 * migrated. Carrying it forward would silently defeat the whole point of the
 * choice above.
 */
const secureStorage: StateStorage = {
  getItem: async (name) => {
    if (Platform.OS === "web") {
      try {
        if (localStorage.getItem(name)) localStorage.removeItem(name);
      } catch {
        /* private mode, or storage disabled */
      }
      return sessionStorage.getItem(name);
    }
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name, value) => {
    if (Platform.OS === "web") sessionStorage.setItem(name, value);
    else await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    if (Platform.OS === "web") sessionStorage.removeItem(name);
    else await SecureStore.deleteItemAsync(name);
  },
};

const STORAGE_KEY = "parentai-admin";

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      isHydrated: false,
      isAuthChecked: false,

      setAuth: (admin, token) => set({ admin, token, isAuthenticated: true }),

      logout: async () => {
        await secureStorage.removeItem(STORAGE_KEY);
        set({ admin: null, token: null, isAuthenticated: false });
      },

      /**
       * There is no refresh flow here, and that is the server's design rather
       * than an omission: an admin token lasts two hours and `POST /admin/login`
       * is the only way to get one. Staff sign in again twice a day; a
       * long-lived refresh token for an account with this much reach would be a
       * worse trade than the inconvenience.
       *
       * So an expired token means signed out, with none of the offline grace the
       * parent store extends — that grace exists because a family may be mid
       * session on a bad connection, which is not a situation staff tooling has.
       */
      initializeAuth: async () => {
        const { token, logout } = get();
        if (!token) {
          set({ isAuthChecked: true });
          return;
        }
        if (isTokenExpired(token)) {
          await logout();
          set({ isAuthChecked: true });
          return;
        }
        set({ isAuthenticated: true, isAuthChecked: true });
      },

      isSuperadmin: () => get().admin?.role === "superadmin",
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ admin: state.admin, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isHydrated = true;
      },
    },
  ),
);
