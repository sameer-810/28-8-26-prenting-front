import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";
import { useTheme } from "@shared/useTheme";
import { useBreakpoint } from "@shared/ui";
import { OfflineBanner } from "@shared/offline/OfflineBanner";
import HomeScreen from "@modules/home/screens/HomeScreen";
import AddChildScreen from "@modules/onboarding/screens/AddChildScreen";
import CaptureScreen from "@modules/capture/screens/CaptureScreen";
import ProgressScreen from "@modules/progress/screens/ProgressScreen";
import ChildrenScreen from "@modules/children/screens/ChildrenScreen";
import SettingsScreen from "@modules/settings/screens/SettingsScreen";
import PlansScreen from "@modules/settings/screens/PlansScreen";
import AccountScreen from "@modules/settings/screens/AccountScreen";
import PrivacyScreen from "@modules/settings/screens/PrivacyScreen";
import PlanScreen from "@modules/capture/screens/PlanScreen";
import SessionScreen from "@modules/session/screens/SessionScreen";
import { PhoneTabBar } from "./PhoneTabBar";
import { Sidebar } from "./Sidebar";

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * Hides a tab from assistive technology while it is not the one on screen.
 *
 * A tab navigator keeps every visited tab MOUNTED — that is the point of it,
 * and this app depends on it: a half-filled form or a scrolled report is still
 * there when you come back. The navigator hides the blurred ones by stacking
 * them behind (`zIndex: -1`, `pointerEvents: 'none'`), which is enough for eyes
 * and a mouse and nothing else. On the web nothing is removed from the DOM, so
 * a screen reader walks straight through the dashboard, the progress report and
 * the settings form as one continuous page — three screens' worth of content
 * announced for a parent who can only hear one of them.
 *
 * `aria-hidden` is the right instrument rather than `display: none`, which
 * would fix the same problem by making the browser drop the scroll position of
 * everything inside — trading an accessibility bug for a state bug.
 */
function accessibleWhenFocused(Component: React.ComponentType<any>) {
  return function Scene(props: any) {
    const focused = useIsFocused();
    return (
      <View
        style={{ flex: 1 }}
        aria-hidden={!focused}
        // The native equivalents; the web attribute above does nothing on a
        // phone, and the phone props do nothing on the web.
        accessibilityElementsHidden={!focused}
        importantForAccessibility={focused ? "auto" : "no-hide-descendants"}
      >
        <Component {...props} />
      </View>
    );
  };
}

/**
 * Wrapped once at module scope. Wrapping inside `AppShell` would hand the
 * navigator a new component type on every render and remount the screen —
 * which is exactly the state loss the wrapper exists to avoid.
 */
const HomeTab = accessibleWhenFocused(HomeScreen);
const ProgressTab = accessibleWhenFocused(ProgressScreen);
const ChildrenTab = accessibleWhenFocused(ChildrenScreen);
const SettingsTab = accessibleWhenFocused(SettingsScreen);

/**
 * The app shell — one navigator, two chromes.
 *
 * A bottom-tab navigator owns the routing on BOTH layouts, and only the chrome
 * differs: `tabBarPosition` moves the bar to the left edge on a wide window,
 * where it renders as a permanent sidebar. The same slot, the same navigator,
 * the same state.
 *
 * TWO THINGS THIS SHAPE BUYS, both learned the hard way:
 *
 * 1. It does not swap navigators at a breakpoint. That would remount every
 *    screen when a desktop window is dragged past 900px, losing scroll
 *    position, form state and any session in progress — unacceptable in a
 *    product whose central object is a 30-minute timed session.
 *
 * 2. The sidebar drives the tab navigator DIRECTLY. It used to sit outside, in
 *    a wrapper rendered as the stack's "Shell" screen, and navigate inwards
 *    with `navigate("Shell", { screen })`. Because the stack was already on
 *    "Shell", React Navigation treated that as a param merge on the current
 *    route: the URL changed to /progress, the sidebar highlighted the row, and
 *    the tab navigator underneath never moved. Rendering the sidebar in the
 *    `tabBar` slot hands it that navigator's own `navigation`, so a click is an
 *    ordinary `navigate(route.name)` with nothing to forward.
 */
function AppShell() {
  const theme = useTheme();
  const { isWide } = useBreakpoint();

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarPosition: isWide ? "left" : "bottom",
        sceneStyle: { backgroundColor: theme.surface.secondary },
      }}
      tabBar={(props) => (isWide ? <Sidebar {...props} /> : <PhoneTabBar {...props} />)}
    >
      <Tabs.Screen name="Home" component={HomeTab} />
      <Tabs.Screen name="Progress" component={ProgressTab} />
      <Tabs.Screen name="Children" component={ChildrenTab} />
      <Tabs.Screen name="Settings" component={SettingsTab} />
    </Tabs.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <View style={{ flex: 1 }}>
      {/* Above everything, so it is visible whichever screen is open. */}
      <OfflineBanner />
      <View style={{ flex: 1 }}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Shell" component={AppShell} />
          {/**
           * Screens pushed OVER the shell rather than inside a tab: they are
           * focused tasks with their own way out, and having a tab bar under a
           * running session would invite a parent to navigate away from it.
           */}
          <Stack.Screen name="AddChild" component={AddChildScreen} />
          <Stack.Screen name="Plans" component={PlansScreen} />
          <Stack.Screen name="Account" component={AccountScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />

          <Stack.Screen name="Capture" component={CaptureScreen} />
          <Stack.Screen name="Plan" component={PlanScreen} />
          {/**
           * The session player has NO gesture back and no swipe-to-dismiss: it
           * owns its own exit, which asks before abandoning an evening's work.
           * A stray edge swipe mid-phase must not end a session.
           */}
          <Stack.Screen
            name="Session"
            component={SessionScreen}
            options={{ gestureEnabled: false, animation: "fade" }}
          />
        </Stack.Navigator>
      </View>
    </View>
  );
}
