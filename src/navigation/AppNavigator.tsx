import React from "react";
import { View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigationState } from "@react-navigation/native";
import { useAppNavigation } from "./types";
import { useTheme } from "@shared/useTheme";
import { useBreakpoint } from "@shared/ui";
import { OfflineBanner } from "@shared/offline/OfflineBanner";
import HomeScreen from "@modules/home/screens/HomeScreen";
import AddChildScreen from "@modules/onboarding/screens/AddChildScreen";
import { PhoneTabBar } from "./PhoneTabBar";
import { Sidebar } from "./Sidebar";
import { NAV_ITEMS } from "./navItems";
import type { TabParamList } from "./types";
import { PlaceholderScreen } from "./PlaceholderScreen";

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/**
 * The app shell — one navigator, two chromes.
 *
 * A bottom-tab navigator owns the routing on BOTH layouts, and only the chrome
 * differs: the tab bar is rendered on a phone, and suppressed on a wide layout
 * where a permanent sidebar drives the same navigator instead.
 *
 * The alternative — swapping navigators at a breakpoint — remounts every screen
 * when a desktop window is resized past 900px, losing scroll position, form
 * state and any session in progress. That is unacceptable in a product whose
 * central object is a 30-minute timed session.
 */
function TabShell() {
  const { isWide } = useBreakpoint();

  return (
    <Tabs.Navigator
      screenOptions={{ headerShown: false }}
      // On a wide layout the sidebar is the navigation; rendering a tab bar
      // underneath it as well would be two controls for one job.
      tabBar={(props) => (isWide ? null : <PhoneTabBar {...props} />)}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Progress">
        {() => (
          <PlaceholderScreen
            title="Progress"
            body="Daily, weekly, monthly and yearly views arrive with Phase 6."
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen name="Children">
        {() => (
          <PlaceholderScreen
            title="Children"
            body="Managing profiles arrives with Phase 6."
          />
        )}
      </Tabs.Screen>
      <Tabs.Screen name="Settings">
        {() => (
          <PlaceholderScreen
            title="Settings"
            body="Household settings, plan and data controls arrive with Phase 7."
          />
        )}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

/** Wraps the tab shell in the desktop sidebar when the window is wide. */
function ResponsiveShell() {
  const theme = useTheme();
  const { isWide } = useBreakpoint();
  const navigation = useAppNavigation();

  /**
   * Which tab is active, read from the navigator's own state rather than kept
   * in a parallel `useState`. A second copy of "where am I" drifts the moment
   * anything navigates programmatically — a deep link, a back gesture, the
   * session player returning home.
   */
  const activeRoute = useNavigationState((state) => {
    if (!state) return "Home";
    const route = state.routes[state.index];
    const nested = route?.state as { index?: number; routes?: { name: string }[] } | undefined;
    if (nested?.routes && typeof nested.index === "number") {
      return nested.routes[nested.index]?.name ?? "Home";
    }
    return route?.name ?? "Home";
  });

  if (!isWide) return <TabShell />;

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: theme.surface.secondary }}>
      <Sidebar
        activeRoute={NAV_ITEMS.some((i) => i.name === activeRoute) ? activeRoute : "Home"}
        /**
         * The NESTED form, not `navigate(name)`.
         *
         * `ResponsiveShell` is the "Shell" screen, so its navigation object
         * belongs to the parent stack. `navigate("Progress")` searches that
         * navigator and its ancestors — never its children — so it silently did
         * nothing: the sidebar highlighted the row and the screen never
         * changed. Addressing the tab through its navigator is the fix.
         */
        onNavigate={(name) =>
          navigation.navigate("Shell", { screen: name as keyof TabParamList })
        }
      />
      <View style={{ flex: 1 }}>
        <TabShell />
      </View>
    </View>
  );
}

export default function AppNavigator() {
  return (
    <View style={{ flex: 1 }}>
      {/* Above everything, so it is visible whichever screen is open. */}
      <OfflineBanner />
      <View style={{ flex: 1 }}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Shell" component={ResponsiveShell} />
          {/**
           * Screens pushed OVER the shell rather than inside a tab: they are
           * focused tasks with their own way out, and having a tab bar under a
           * running session would invite a parent to navigate away from it.
           */}
          <Stack.Screen name="AddChild" component={AddChildScreen} />

          {/**
           * Phase 5's flow, registered now as named placeholders.
           *
           * The home screen already routes to these, and a button that
           * navigates nowhere is worse than one that lands on a screen saying
           * what is coming — it reads as a bug rather than as unfinished work.
           */}
          <Stack.Screen name="Capture">
            {() => (
              <PlaceholderScreen
                title="Plan a session"
                body="Say it, type it, or photograph the page — the capture flow arrives with Phase 5."
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Plan">
            {() => (
              <PlaceholderScreen
                title="Session plan"
                body="The five-phase plan view arrives with Phase 5."
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Session">
            {() => (
              <PlaceholderScreen
                title="Session"
                body="The 30-minute session player arrives with Phase 5."
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </View>
    </View>
  );
}
