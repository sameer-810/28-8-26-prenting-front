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
 * Hides a tab from assistive technology while it is not on screen.
 *
 * A tab navigator keeps every visited tab mounted, and hides the blurred ones
 * by stacking them behind (`zIndex: -1`, `pointerEvents: 'none'`). That is
 * enough for eyes and a mouse and nothing else — on the web they stay in the
 * DOM, so a screen reader reads the dashboard, the report and the settings form
 * as one continuous page.
 *
 * `aria-hidden`, not `display: none`: the latter makes the browser drop the
 * scroll position of everything inside, trading an accessibility bug for a
 * state bug.
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

// Wrapped at module scope. Doing it inside AppShell hands the navigator a new
// component type every render, remounting the screen on each one.
const HomeTab = accessibleWhenFocused(HomeScreen);
const ProgressTab = accessibleWhenFocused(ProgressScreen);
const ChildrenTab = accessibleWhenFocused(ChildrenScreen);
const SettingsTab = accessibleWhenFocused(SettingsScreen);

/**
 * The app shell — one navigator, two chromes. `tabBarPosition` moves the bar to
 * the left edge on a wide window, where it renders as the sidebar.
 *
 * Do not swap navigators at the breakpoint instead. That remounts every screen
 * when a desktop window is dragged past 900px, losing scroll position, form
 * state and any session in progress.
 *
 * Do not render the sidebar outside this navigator either. From out there,
 * `navigate("Shell", { screen })` is a param merge on the route the stack is
 * already on: the URL changes, the row highlights, and the tab underneath never
 * moves. The `tabBar` slot hands the sidebar this navigator's own
 * `navigation`, so a click is an ordinary `navigate(route.name)`.
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
      tabBar={(props) =>
        isWide ? <Sidebar {...props} /> : <PhoneTabBar {...props} />
      }
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
          {/* Pushed OVER the shell, not inside a tab — focused tasks with
              their own way out. A tab bar under a running session invites a
              parent to navigate away from it. */}
          <Stack.Screen name="AddChild" component={AddChildScreen} />
          <Stack.Screen name="Plans" component={PlansScreen} />
          <Stack.Screen name="Account" component={AccountScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />

          <Stack.Screen name="Capture" component={CaptureScreen} />
          <Stack.Screen name="Plan" component={PlanScreen} />
          {/* No gesture back: the player owns its exit, which asks before
              abandoning an evening's work. A stray edge swipe mid-phase must
              not end a session. */}
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
