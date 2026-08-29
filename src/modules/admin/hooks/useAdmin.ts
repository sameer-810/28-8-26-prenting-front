import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminStore } from "@shared/store/useAdminStore";
import { adminApi, type ListFamiliesParams } from "../api/adminApi";

/**
 * Query keys for the console, namespaced under "admin".
 *
 * The namespace is what makes `queryClient.removeQueries({ queryKey: ["admin"] })`
 * on sign-out a complete operation. Staff data and family data share one cache,
 * and a household list left behind after a staff member signs out would be
 * served straight back to whoever opened the console next on that machine.
 */
export const adminKeys = {
  all: ["admin"] as const,
  overview: () => [...adminKeys.all, "overview"] as const,
  families: (params: ListFamiliesParams) => [...adminKeys.all, "families", params] as const,
  family: (id: string) => [...adminKeys.all, "family", id] as const,
  curriculum: () => [...adminKeys.all, "curriculum"] as const,
  admins: () => [...adminKeys.all, "admins"] as const,
};

export function useAdminLogin() {
  const setAuth = useAdminStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      adminApi.login(email, password),
    onSuccess: (payload) => {
      setAuth(payload.admin, payload.token);
      // Nothing from a previous staff session may survive into this one.
      queryClient.removeQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useAdminLogout() {
  const logout = useAdminStore((s) => s.logout);
  const queryClient = useQueryClient();

  return async () => {
    await logout();
    queryClient.removeQueries({ queryKey: adminKeys.all });
  };
}

export function useAdminOverview() {
  return useQuery({
    queryKey: adminKeys.overview(),
    queryFn: adminApi.overview,
    /**
     * Half a minute. This is an operational dashboard somebody watches during
     * an incident, so it should not serve a five-minute-old degradation rate —
     * but it is also four aggregations over every collection, so it must not be
     * refetched on every focus change either.
     */
    staleTime: 30_000,
  });
}

export function useAdminFamilies(params: ListFamiliesParams) {
  return useQuery({
    queryKey: adminKeys.families(params),
    queryFn: () => adminApi.listFamilies(params),
    // Keeps the previous page on screen while the next one loads, so paging
    // does not flash an empty table.
    placeholderData: (previous) => previous,
    staleTime: 15_000,
  });
}

export function useAdminFamily(id: string) {
  return useQuery({
    queryKey: adminKeys.family(id),
    queryFn: () => adminApi.familyDetail(id),
    enabled: Boolean(id),
  });
}

export function useAdminCurriculum() {
  return useQuery({
    queryKey: adminKeys.curriculum(),
    queryFn: adminApi.curriculum,
    // The curriculum changes when somebody runs a seed script, not during a
    // shift. An hour is generous and still not stale in any way that matters.
    staleTime: 60 * 60 * 1000,
  });
}

export function useAdminList() {
  return useQuery({ queryKey: adminKeys.admins(), queryFn: adminApi.listAdmins });
}

/**
 * The two write operations.
 *
 * Both invalidate the household AND the overview: changing a plan moves the
 * entitled-MRR figure and the by-plan breakdown, and a console that showed the
 * new plan on one screen and the old total on another would be its own support
 * ticket.
 */
export function useSetPlan(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planCode, note }: { planCode: Parameters<typeof adminApi.setPlan>[1]; note: string }) =>
      adminApi.setPlan(familyId, planCode, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.family(familyId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.overview() });
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, "families"] });
    },
  });
}

export function useSetActive(familyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ isActive, note }: { isActive: boolean; note: string }) =>
      adminApi.setActive(familyId, isActive, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.family(familyId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.overview() });
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, "families"] });
    },
  });
}

export function useCreateAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createAdmin,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.admins() }),
  });
}
