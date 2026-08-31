import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAdminStore } from "@shared/store/useAdminStore";
import { useTheme } from "@shared/useTheme";
import { palette } from "@shared/designSystem";
import { AdminNav, type AdminSection } from "@modules/admin/components/AdminNav";
import AdminLoginScreen from "@modules/admin/screens/AdminLoginScreen";
import AdminDashboardScreen from "@modules/admin/screens/AdminDashboardScreen";
import AdminFamiliesScreen from "@modules/admin/screens/AdminFamiliesScreen";
import AdminFamilyDetailScreen from "@modules/admin/screens/AdminFamilyDetailScreen";
import AdminCurriculumScreen from "@modules/admin/screens/AdminCurriculumScreen";
import AdminStaffScreen from "@modules/admin/screens/AdminStaffScreen";

const Stack = createNativeStackNavigator();

/**
 * The platform console — a top-level route (`/admin` on the web), gated by
 * `useAdminStore` and completely independent of the parent session.
 *
 * A parent who wanders onto `/admin` sees the staff login and nothing else,
 * whether or not they are signed in as a parent. The two stores do not know
 * about each other, so the two sessions coexist: signing in here does not sign
 * them out of their own account, and signing out here leaves it untouched.
 *
 * Because the alternative is a second front-end project — a second lockfile, a
 * second design system to keep in step, a second deploy that can rot unnoticed.
 * This shares the app's components, its theme, its API client and its build.
 * The cost is that the console ships inside the web bundle, and the mitigation
 * is that it is a handful of screens made of components the app already carries,
 * not a second application.
 */
export default function AdminNavigator() {
  const theme = useTheme();
  const { isAuthenticated, isHydrated, isAuthChecked } = useAdminStore();

  useEffect(() => {
    if (isHydrated) void useAdminStore.getState().initializeAuth();
  }, [isHydrated]);

  /**
   * Held until the persisted session has both loaded and been judged. Rendering
   * the login screen in that gap would flash it at a staff member on every
   * reload — and this session is per-tab, so reloads are common.
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

  if (!isAuthenticated) return <AdminLoginScreen />;

  return (
    <Stack.Navigator
      /**
       * The console's chrome is the stack's HEADER, not a sibling above it.
       *
       * Rendering it as a sibling was the first attempt and it was wrong in
       * exactly the way the parent app's sidebar was: a component outside a
       * navigator reads the state of the navigator ABOVE it, and its
       * `navigate` searches that one and its ancestors — never its children.
       * The result is a nav bar that highlights rows correctly-looking and
       * moves nothing. The `header` slot is handed the navigation and route of
       * the stack it belongs to, so both problems are structural rather than
       * remembered.
       */
      screenOptions={{
        headerShown: true,
        header: ({ navigation, route }) => (
          <AdminNav
            /** The detail screen is reached from Households, so that stays lit. */
            active={(route.name === "AdminFamilyDetail" ? "AdminFamilies" : route.name) as AdminSection}
            onNavigate={(section) => navigation.navigate(section)}
          />
        ),
        contentStyle: { backgroundColor: theme.surface.secondary },
      }}
    >
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminFamilies" component={AdminFamiliesScreen} />
      <Stack.Screen name="AdminFamilyDetail" component={AdminFamilyDetailScreen} />
      <Stack.Screen name="AdminCurriculum" component={AdminCurriculumScreen} />
      <Stack.Screen name="AdminStaff" component={AdminStaffScreen} />
    </Stack.Navigator>
  );
}
