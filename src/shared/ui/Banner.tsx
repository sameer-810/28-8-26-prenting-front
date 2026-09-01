import React from "react";
import { View, Pressable } from "react-native";
import { Info, AlertTriangle, CheckCircle2, X } from "lucide-react-native";
import { radius } from "../designSystem";
import { useTheme } from "../useTheme";
import { Text } from "./Text";
import { VStack } from "./Stack";

type Tone = "info" | "success" | "warning" | "danger";

/**
 * An inline message attached to the thing it is about.
 *
 * Never a toast. A toast that says "we couldn't reach our AI, here's a
 * structured session you can still run" disappears before a tired parent has
 * read it, and the information is about the plan on screen — so it belongs
 * beside the plan.
 */
export function Banner({
  tone = "info",
  title,
  body,
  action,
  onDismiss,
}: {
  tone?: Tone;
  title: string;
  body?: string;
  action?: React.ReactNode;
  onDismiss?: () => void;
}) {
  const theme = useTheme();
  const map = {
    info: { c: theme.info, Icon: Info },
    success: { c: theme.success, Icon: CheckCircle2 },
    warning: { c: theme.warning, Icon: AlertTriangle },
    danger: { c: theme.danger, Icon: AlertTriangle },
  }[tone];

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: "row",
        gap: 10,
        padding: 14,
        borderRadius: radius.md,
        backgroundColor: map.c.bg,
        borderWidth: 1,
        borderColor: map.c.border,
      }}
    >
      <map.Icon size={18} color={map.c.text} style={{ marginTop: 1 }} />
      <VStack gap={4} flex={1}>
        <Text variant="label" style={{ color: map.c.text }}>
          {title}
        </Text>
        {body ? (
          <Text variant="body-sm" style={{ color: map.c.text, opacity: 0.9 }}>
            {body}
          </Text>
        ) : null}
        {action}
      </VStack>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <X size={16} color={map.c.text} />
        </Pressable>
      ) : null}
    </View>
  );
}
