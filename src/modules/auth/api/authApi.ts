import { apiClient, unwrap } from "@api/apiClient";
import { deviceContext } from "@api/deviceId";
import { POLICY_VERSION } from "@config/env";
import type { Parent, Family } from "@shared/store/useAuthStore";
import type { LanguageCode } from "@shared/fonts";
import type { SessionPayload, ChildProfile, ReferenceData } from "../types";

export const authApi = {
  async login(input: { email: string; password: string }) {
    const device = await deviceContext();
    return unwrap<SessionPayload>(
      apiClient.post("/auth/login", { ...input, device }),
    );
  },

  async signup(input: {
    familyName: string;
    firstName: string;
    lastName?: string;
    email: string;
    password: string;
    homeLanguage?: LanguageCode;
  }) {
    const device = await deviceContext();
    return unwrap<SessionPayload>(
      apiClient.post("/auth/signup", {
        ...input,
        // Consent is captured at the moment of signup with the version the app
        // actually presented — a record that says "accepted" without saying to
        // WHAT is not a demonstrable consent record.
        consent: { accepted: true, policyVersion: POLICY_VERSION },
        device,
      }),
    );
  },

  async me() {
    return unwrap<{ user: Parent; family: Family; children: ChildProfile[] }>(
      apiClient.get("/auth/me"),
    );
  },

  async forgotPassword(email: string) {
    return unwrap<{ message: string }>(
      apiClient.post("/auth/forgot-password", { email }),
    );
  },

  async resetPassword(input: { token: string; password: string }) {
    return unwrap<{ message: string }>(
      apiClient.post("/auth/reset-password", input),
    );
  },

  async changePassword(input: {
    currentPassword: string;
    newPassword: string;
  }) {
    return unwrap<{ message: string }>(
      apiClient.post("/auth/change-password", input),
    );
  },

  async devices() {
    return unwrap<
      { id: string; deviceName: string; platform: string; lastUsedAt: string }[]
    >(apiClient.get("/auth/devices"));
  },

  async revokeDevice(id: string) {
    return unwrap<{ message: string }>(apiClient.delete(`/auth/devices/${id}`));
  },
};

export const childApi = {
  async list() {
    return unwrap<ChildProfile[]>(apiClient.get("/children"));
  },
  async create(input: {
    name: string;
    grade: number;
    board?: string;
    schoolMedium?: string;
    homeLanguage?: string;
    schoolName?: string;
  }) {
    return unwrap<ChildProfile>(apiClient.post("/children", input));
  },
  async update(id: string, patch: Partial<ChildProfile>) {
    return unwrap<ChildProfile>(apiClient.patch(`/children/${id}`, patch));
  },
  async remove(id: string) {
    return unwrap<{ message: string }>(apiClient.delete(`/children/${id}`));
  },
};

export const referenceApi = {
  /**
   * Boards, languages, grades and plans — served by the API rather than
   * hardcoded, because prices and board lists change without an app release
   * and a stale copy in the client would show the wrong price at checkout.
   */
  async all() {
    return unwrap<ReferenceData>(apiClient.get("/reference"));
  },
};

/** Re-exported for existing imports; the shapes live in `../types`. */
export type { SessionPayload, ChildProfile, ReferenceData } from "../types";
