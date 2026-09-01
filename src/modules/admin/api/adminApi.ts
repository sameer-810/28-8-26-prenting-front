import axios from "axios";
import { environment } from "@config/env";
import { adminApiClient } from "@shared/api/adminApiClient";
import type { PlatformAdmin } from "@shared/store/useAdminStore";
import type {
  AdminOverview,
  AdminFamilyRow,
  AdminFamilyDetail,
  CurriculumCoverageRow,
  PlatformAdminRow,
  ListMeta,
  PlanCode,
  SubscriptionStatus,
} from "../types";

export interface ListFamiliesParams {
  page?: number;
  limit?: number;
  search?: string;
  planCode?: PlanCode;
  status?: SubscriptionStatus;
}

export const adminApi = {
  /**
   * Login goes through a bare `axios`, not `adminApiClient`.
   *
   * The client's response interceptor signs the admin out on any 401 — which is
   * right for every call except this one, where a 401 IS the expected answer to
   * a wrong password. Routing it through would make a typo indistinguishable
   * from a session ending.
   */
  login: (email: string, password: string) =>
    axios
      .post(`${environment.apiUrl}/admin/login`, { email, password })
      .then((r) => r.data.data as { admin: PlatformAdmin; token: string }),

  me: () => adminApiClient.get("/me").then((r) => r.data.data as PlatformAdmin),

  overview: () =>
    adminApiClient.get("/overview").then((r) => r.data.data as AdminOverview),

  listFamilies: (params: ListFamiliesParams) =>
    adminApiClient
      .get("/families", { params })
      .then((r) => r.data as { data: AdminFamilyRow[]; meta: ListMeta }),

  familyDetail: (id: string) =>
    adminApiClient
      .get(`/families/${id}`)
      .then((r) => r.data.data as AdminFamilyDetail),

  /**
   * Both write operations take a mandatory `note`, enforced by the server and
   * surfaced as a required field in the UI. Changing what a household is
   * entitled to without recording why is how a billing dispute becomes
   * unanswerable six months later.
   */
  setPlan: (id: string, planCode: PlanCode, note: string) =>
    adminApiClient
      .patch(`/families/${id}/plan`, { planCode, note })
      .then((r) => r.data.data),

  setActive: (id: string, isActive: boolean, note: string) =>
    adminApiClient
      .patch(`/families/${id}/active`, { isActive, note })
      .then((r) => r.data.data),

  curriculum: () =>
    adminApiClient
      .get("/curriculum")
      .then((r) => r.data.data as CurriculumCoverageRow[]),

  listAdmins: () =>
    adminApiClient
      .get("/admins")
      .then((r) => r.data.data as PlatformAdminRow[]),

  createAdmin: (input: {
    name: string;
    email: string;
    password: string;
    role: "superadmin" | "support";
  }) =>
    adminApiClient
      .post("/admins", input)
      .then((r) => r.data.data as PlatformAdminRow),
};
