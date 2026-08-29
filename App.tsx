import React, { useEffect } from "react";
import { Platform, View, useColorScheme } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
/**
 * Per-WEIGHT imports, not package imports.
 *
 * `from "@expo-google-fonts/inter"` pulls the package index, which references
 * every weight it ships — Thin through Black, plus italics. Measured, that put
 * 85 font files and 16MB into the web build for the five faces this design
 * system actually uses.
 */
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Fraunces_400Regular } from "@expo-google-fonts/fraunces/400Regular";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces/600SemiBold";

import RootNavigator from "@navigation/RootNavigator";
import { navigationRef } from "@navigation/navigationRef";
import { palette, darkPalette } from "@shared/designSystem";
import { startOfflineEngine } from "@shared/offline/outboxEngine";

const APP_TITLE = "ParentAI";

/**
 * `networkMode: "always"` on both halves, because this app owns its own
 * connectivity model and React Query's default fights it.
 *
 * The default ("online") gates on `navigator.onLine`. A paused MUTATION never
 * calls its `mutationFn` at all — so a session checkpoint would never reach the
 * outbox, and the one moment offline support exists for is the one moment it
 * would not run. Queries are the same story: a paused query never runs, so a
 * cached-plan fallback never gets the chance to answer.
 *
 * `useOfflineStore` decides what offline means here, inferred from real traffic
 * and a /health probe — strictly better informed than a browser flag that only
 * knows whether an interface is up.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      networkMode: "always",
      staleTime: 30_000,
    },
    mutations: { networkMode: "always" },
  },
});

/**
 * URL ↔ route mapping. This is the half that makes the web build behave like a
 * web app: the address bar follows the section, a refresh restores it, and
 * back/forward work.
 *
 * Every section is listed. An unmapped route silently falls back to the initial
 * one on reload, which is precisely the bug this config exists to prevent.
 */
const linking = {
  prefixes: [],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: "login",
          Signup: "signup",
          ForgotPassword: "forgot-password",
        },
      },
      App: {
        screens: {
          Shell: {
            screens: {
              Home: "",
              Progress: "progress",
              Children: "children",
              Settings: "settings",
            },
          },
          AddChild: "children/add",
          Plans: "settings/plans",
          Account: "settings/account",
          Privacy: "settings/privacy",
          /**
           * The session flow is deep-linkable on purpose.
           *
           * On the web a parent WILL refresh, or reopen the tab, mid-session.
           * Without a URL that lands them back on the dashboard with a
           * half-finished session they have to hunt for; with one, the player
           * reopens on the phase they were on — the plan is already cached on
           * the device, so it works even if the network has gone since.
           */
          Capture: "plan/new/:childId",
          Plan: "plan/:planId",
          Session: "session/:sessionId",
        },
      },
    },
  },
};

export default function App() {
  const scheme = useColorScheme();

  /**
   * Only the LATIN faces load at boot. The parent's Indic script is fetched
   * lazily once their language is known — see shared/fonts.ts. Loading all six
   * upfront would be several hundred KB for scripts most families never see.
   */
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Fraunces_400Regular,
    Fraunces_600SemiBold,
  });

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.title = APP_TITLE;
    }
    startOfflineEngine(queryClient);
  }, []);

  const theme = scheme === "dark" ? darkPalette : palette;

  if (!fontsLoaded) {
    // A bare tinted ground rather than a spinner: at this point the app has
    // nothing to say, and a spinner for 200ms is a flash of anxiety.
    return <View style={{ flex: 1, backgroundColor: theme.surface.secondary }} />;
  }

  /**
   * React Navigation paints the space behind screens — during transitions and
   * under a sheet. Left at its default it is white, which flashes against the
   * warm sand canvas on every push and looks like a rendering fault.
   */
  const navTheme = {
    ...(scheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === "dark" ? DarkTheme : DefaultTheme).colors,
      background: theme.surface.secondary,
      card: theme.surface.primary,
      text: theme.text.primary,
      border: theme.border.default,
      primary: palette.moss[600],
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <NavigationContainer
            ref={navigationRef}
            theme={navTheme as never}
            linking={linking as never}
            /**
             * Deliberately constant rather than per-screen. The formatter is
             * handed the PREVIOUS route's options on a nested navigator, so
             * naming the screen labels the browser tab one screen behind —
             * which is worse than a title that never changes.
             */
            documentTitle={{ formatter: () => APP_TITLE }}
          >
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
