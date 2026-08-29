import type { NavigatorScreenParams } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

/**
 * The route graph, typed once.
 *
 * Without this every screen writes `useNavigation<never>()` and then
 * `navigate("Foo" as never)`, which typechecks by disabling the checker — so a
 * renamed route or a missing param compiles happily and fails at runtime, on a
 * device, in front of a parent. Declaring the graph is what makes a typo in a
 * route name a build error.
 */

export type TabParamList = {
  Home: undefined;
  Progress: undefined;
  Children: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  Shell: NavigatorScreenParams<TabParamList> | undefined;
  AddChild: undefined;
  /** Phase 5 — the capture → plan → session flow. */
  Capture: { childId: string };
  Plan: { planId: string };
  Session: { sessionId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string };
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  App: NavigatorScreenParams<AppStackParamList> | undefined;
};

/**
 * Screens sit inside nested navigators, so a screen may legitimately need to
 * reach a sibling tab, a stack route above it, or the auth stack. Composing the
 * three lists gives one honest type for `navigate` rather than a per-screen
 * guess that is wrong the first time a screen is moved.
 */
export type AppNavigation = NativeStackNavigationProp<
  AppStackParamList & AuthStackParamList & TabParamList
>;

export function useAppNavigation() {
  return useNavigation<AppNavigation>();
}

/**
 * Go to a TAB, from anywhere.
 *
 * The tabs live inside the "Shell" screen, so `navigate("Home")` from a stack
 * screen searches that navigator and its ancestors — never its children — and
 * silently does nothing. That has now bitten twice: the desktop sidebar
 * highlighted rows without moving, and "Done" at the end of a session left the
 * parent staring at the completion sheet.
 *
 * Both were invisible to the typechecker, because "Home" is a perfectly valid
 * route name. This helper is the fix that generalises: any screen that wants a
 * tab calls this instead of guessing the form.
 */
export function goToTab(navigation: AppNavigation, tab: keyof TabParamList = "Home") {
  navigation.navigate("Shell", { screen: tab });
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
