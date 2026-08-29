import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "@shared/store/useAuthStore";
import { useTheme } from "@shared/useTheme";
import { palette } from "@shared/designSystem";
import AuthNavigator from "./AuthNavigator";
import AppNavigator from "./AppNavigator";
import AdminNavigator from "./AdminNavigator";

const Stack = createNativeStackNavigator();

/**
 * Gates between the auth stack and the app shell.
 *
 * The `key` on the navigator is deliberate: it forces a full remount when the
 * session changes, so nothing from a previous account can survive a sign-out
 * into the next one — a screen still mounted with stale data is how one
 * family's dashboard flashes up under another's.
 */
export default function RootNavigator() {
  const theme = useTheme();
  const { isAuthenticated, isHydrated, isAuthChecked } = useAuthStore();

  useEffect(() => {
    if (isHydrated) useAuthStore.getState().initializeAuth();
  }, [isHydrated]);

  /**
   * Held until BOTH the persisted session has loaded and it has been judged.
   * Rendering the login screen in that gap would flash it at every returning
   * parent on every cold start.
   */
  if (!isHydrated || !isAuthChecked) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.surface.secondary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={palette.moss[600]} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={isAuthenticated ? "app-root" : "auth-root"}
      screenOptions={{ headerShown: false }}
    >
      {isAuthenticated ? (
        <Stack.Screen name="App" component={AppNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}

      {/**
       * The platform console, mounted in BOTH branches.
       *
       * It is deliberately outside the parent-session gate above: staff reach
       * `/admin` whether or not anybody is signed in as a parent on this
       * device, and a member of staff should not have to sign a family out of
       * their own tablet to look at a support ticket. `AdminNavigator` runs its
       * own gate on `useAdminStore`, so being here grants nothing — an
       * unauthenticated visitor gets the staff login and no data.
       */}
      <Stack.Screen name="Admin" component={AdminNavigator} />
    </Stack.Navigator>
  );
}
