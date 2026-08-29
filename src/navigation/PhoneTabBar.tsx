import React from "react";
import { View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { layout } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { haptic } from "@shared/touchFeedback";
import { Text } from "@shared/ui/Text";
import { NAV_ITEMS } from "./navItems";

/**
 * The phone shell.
 *
 * Custom rather than the default tab bar for two reasons: the design system's
 * warm surfaces and hairline, and a touch target that stays ≥ 48px tall
 * regardless of OS text scaling. The default tab bar clips its label instead.
 */
export function PhoneTabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: theme.surface.primary,
        borderTopWidth: 1,
        borderTopColor: theme.border.default,
        paddingBottom: insets.bottom,
        minHeight: layout.tabBarHeight + insets.bottom,
      }}
    >
      {state.routes.map((route, index) => {
        const item = NAV_ITEMS.find((i) => i.name === route.name);
        if (!item) return null;

        const focused = state.index === index;
        const color = focused ? theme.text.accent : theme.text.tertiary;
        const Icon = item.icon;

        return (
          <Pressable
            key={route.key}
            onPress={() => {
              haptic("select");
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
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              paddingVertical: 10,
              minHeight: 52,
            }}
          >
            <Icon size={21} color={color} strokeWidth={focused ? 2.4 : 1.9} />
            <Text
              variant="label-sm"
              style={{ color, fontSize: 11 }}
              // Capped: this label lives in a fixed slot, and past this it is
              // clipped rather than helpful.
              maxFontSizeMultiplier={1.3}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
