import React from "react";
import { View, Pressable, ScrollView } from "react-native";
import { LogOut } from "lucide-react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { layout, radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { useAuthStore } from "@shared/store/useAuthStore";
import { Text } from "@shared/ui/Text";
import { VStack, HStack } from "@shared/ui/Stack";
import { useLogout } from "@modules/auth/hooks/useAuth";
import { NAV_ITEMS } from "./navItems";

/**
 * The desktop shell.
 *
 * Appears at ≥ 900px, replacing the phone tab bar. This product genuinely runs
 * on a laptop — a parent planning the week at a kitchen table, or reading a
 * report — so the wide layout is a real target rather than a responsive
 * afterthought, and it is fully keyboard-reachable.
 *
 * It IS the tab bar — same slot as `PhoneTabBar`, just positioned left. That is
 * what makes "which row is active" a read of the navigator's own state rather
 * than a second copy that drifts, and a click an ordinary `navigate` on the
 * navigator that owns the screens. See the note in AppNavigator.
 */
export function Sidebar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const family = useAuthStore((s) => s.family);
  const logout = useLogout();

  return (
    <View
      style={{
        width: layout.sidebarWidth,
        backgroundColor: theme.surface.primary,
        borderRightWidth: 1,
        borderRightColor: theme.border.default,
      }}
    >
      <VStack gap={2} style={{ padding: 20, paddingBottom: 14 }}>
        <Text variant="h2" tone="accent">
          ParentAI
        </Text>
        {family ? (
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {family.name}
          </Text>
        ) : null}
      </VStack>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12 }}>
        <VStack gap={2}>
          {state.routes.map((route, index) => {
            const item = NAV_ITEMS.find((i) => i.name === route.name);
            if (!item) return null;

            const focused = state.index === index;
            const Icon = item.icon;
            return (
              <Pressable
                key={route.key}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                aria-selected={focused}
                accessibilityLabel={item.label}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  minHeight: layout.navRowHeight,
                  paddingHorizontal: 12,
                  borderRadius: radius.md,
                  backgroundColor: focused ? theme.accents.moss.tint : "transparent",
                }}
              >
                <Icon
                  size={18}
                  color={focused ? theme.text.accent : theme.text.tertiary}
                  strokeWidth={focused ? 2.3 : 1.9}
                />
                <Text variant="label" tone={focused ? "accent" : "secondary"}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </VStack>
      </ScrollView>

      <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: theme.border.subtle }}>
        <HStack gap={10} style={{ paddingHorizontal: 8, paddingBottom: 10 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.full,
              backgroundColor: theme.accents.moss.tint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text variant="label-sm" tone="accent">
              {(user?.firstName || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
          <VStack gap={0} flex={1}>
            <Text variant="label-sm" numberOfLines={1}>
              {user?.fullName || user?.firstName}
            </Text>
            <Text variant="caption" tone="tertiary" numberOfLines={1}>
              {user?.email}
            </Text>
          </VStack>
        </HStack>

        <Pressable
          onPress={() => logout.mutate()}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            minHeight: layout.navRowHeight,
            paddingHorizontal: 12,
            borderRadius: radius.md,
          }}
        >
          <LogOut size={17} color={theme.text.tertiary} />
          <Text variant="label" tone="secondary">
            Sign out
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
