import React from "react";
import { View, Pressable, ScrollView } from "react-native";
import { LogOut, ShieldCheck } from "lucide-react-native";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { Text } from "@shared/ui/Text";
import { VStack, HStack } from "@shared/ui/Stack";
import { useAdminStore } from "@shared/store/useAdminStore";
import { useAdminLogout } from "../hooks/useAdmin";

export type AdminSection =
  "AdminDashboard" | "AdminFamilies" | "AdminCurriculum" | "AdminStaff";

const SECTIONS: { key: AdminSection; label: string }[] = [
  { key: "AdminDashboard", label: "Overview" },
  { key: "AdminFamilies", label: "Households" },
  { key: "AdminCurriculum", label: "Curriculum" },
  { key: "AdminStaff", label: "Staff" },
];

/**
 * The console's navigation — a header row, not the parent app's sidebar and not
 * a tab navigator.
 *
 * The parent shell keeps four screens mounted so a half-filled form survives a
 * detour. Staff move between read-mostly tables a few times a day, so that
 * machinery buys nothing and would put admin screens inside the navigator
 * families use.
 *
 * The staff member's ROLE is always on screen: a support account seeing no plan
 * controls has to be able to tell that is their role, not a broken page.
 */
export function AdminNav({
  active,
  onNavigate,
}: {
  active: AdminSection;
  onNavigate: (section: AdminSection) => void;
}) {
  const theme = useTheme();
  const admin = useAdminStore((s) => s.admin);
  const logout = useAdminLogout();

  return (
    <View
      style={{
        backgroundColor: theme.surface.primary,
        borderBottomWidth: 1,
        borderBottomColor: theme.border.default,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
      }}
    >
      <HStack justify="space-between" align="center" wrap gap={12}>
        <HStack gap={9} align="center">
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: radius.sm,
              backgroundColor: theme.accents.moss.tint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={15} color={theme.text.accent} />
          </View>
          <VStack gap={0}>
            <Text variant="label" tone="accent">
              ParentAI
            </Text>
            <Text variant="caption" tone="tertiary">
              Platform console
            </Text>
          </VStack>
        </HStack>

        <HStack gap={10} align="center">
          <VStack gap={0} style={{ alignItems: "flex-end" }}>
            <Text variant="label-sm" numberOfLines={1}>
              {admin?.name || "Staff"}
            </Text>
            <Text variant="caption" tone="tertiary">
              {admin?.role === "superadmin"
                ? "superadmin"
                : "support — read only"}
            </Text>
          </VStack>
          <Pressable
            onPress={() => void logout()}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              minHeight: 36,
              paddingHorizontal: 10,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: theme.border.strong,
            }}
          >
            <LogOut size={15} color={theme.text.tertiary} />
            <Text variant="label-sm" tone="secondary">
              Sign out
            </Text>
          </Pressable>
        </HStack>
      </HStack>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 4, paddingTop: 10 }}
      >
        {SECTIONS.map((s) => {
          const focused = s.key === active;
          return (
            <Pressable
              key={s.key}
              onPress={() => onNavigate(s.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              // React Native Web does not map accessibilityState onto a
              // Pressable — see shared/ui/Toggle.tsx.
              aria-selected={focused}
              accessibilityLabel={s.label}
              style={{
                minHeight: 36,
                justifyContent: "center",
                paddingHorizontal: 13,
                borderRadius: radius.full,
                backgroundColor: focused
                  ? theme.accents.moss.tint
                  : "transparent",
              }}
            >
              <Text variant="label-sm" tone={focused ? "accent" : "tertiary"}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
