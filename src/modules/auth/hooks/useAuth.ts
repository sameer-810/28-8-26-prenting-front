import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@shared/store/useAuthStore";
import { useFontStore } from "@shared/fonts";
import { authApi, childApi, referenceApi } from "../api/authApi";

/**
 * The one place a session is established.
 *
 * Both mutations do the same three things on success, and doing them here
 * rather than in each screen is what keeps login and signup from drifting:
 * store the session, warm the parent's script font, and drop any cached data
 * belonging to whoever was signed in before.
 */
function useSessionEstablisher() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const ensureFont = useFontStore((s) => s.ensure);
  const queryClient = useQueryClient();

  return (payload: Awaited<ReturnType<typeof authApi.login>>) => {
    setAuth(
      payload.user,
      payload.family,
      payload.accessToken,
      payload.refreshToken,
    );

    /**
     * Warm the home language's font now, in the background.
     *
     * The parent will not see a vernacular string for at least a minute — but
     * starting the download here means the script is already rendered in the
     * right face when they do, rather than reflowing under them mid-read.
     */
    void ensureFont(payload.family.homeLanguage);

    // A previous account's dashboard must never flash up under a new one.
    queryClient.clear();
  };
}

export function useLogin() {
  const establish = useSessionEstablisher();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: establish,
  });
}

export function useSignup() {
  const establish = useSessionEstablisher();
  return useMutation({
    mutationFn: authApi.signup,
    onSuccess: establish,
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword });
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await logout();
      queryClient.clear();
    },
  });
}

/** Who am I, which household, which children — the app's boot call. */
export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const updateUser = useAuthStore((s) => s.updateUser);
  const updateFamily = useAuthStore((s) => s.updateFamily);
  const ensureFont = useFontStore((s) => s.ensure);

  return useQuery({
    queryKey: ["me"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const data = await authApi.me();
      // Refresh the persisted copies: the plan or the household language may
      // have changed on another device since this one last signed in.
      updateUser(data.user);
      updateFamily(data.family);
      void ensureFont(data.family.homeLanguage);
      return data;
    },
  });
}

export function useChildren() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["children"],
    enabled: isAuthenticated,
    queryFn: childApi.list,
  });
}

export function useCreateChild() {
  const queryClient = useQueryClient();
  const ensureFont = useFontStore((s) => s.ensure);
  return useMutation({
    mutationFn: childApi.create,
    onSuccess: (child) => {
      void ensureFont(child.homeLanguage);
      queryClient.invalidateQueries({ queryKey: ["children"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useUpdateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Record<string, unknown>;
    }) => childApi.update(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/**
 * Boards, languages, grades and plans.
 *
 * Cached for a day and kept across sign-outs: it is platform content with no
 * family data in it, it is needed by the signup form before anyone is
 * authenticated, and re-fetching it on every screen that shows a board picker
 * would be a round trip for something that changes monthly at most.
 */
export function useReference() {
  return useQuery({
    queryKey: ["reference"],
    queryFn: referenceApi.all,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
