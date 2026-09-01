import React from "react";
import { View, Pressable } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "../useTheme";
import { haptic } from "../touchFeedback";
import { useBreakpoint } from "./useBreakpoint";
import { Text } from "./Text";
import { VStack, HStack } from "./Stack";

export function ListRow({
  title,
  subtitle,
  left,
  right,
  onPress,
  showChevron,
  destructive,
}: {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
}) {
  const theme = useTheme();
  const { isWide } = useBreakpoint();

  const body = (
    <HStack
      gap={12}
      style={{ minHeight: isWide ? 48 : 62, paddingVertical: 10 }}
    >
      {left}
      <VStack gap={2} flex={1}>
        <Text variant="label-lg" tone={destructive ? "danger" : "primary"}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body-sm" tone="tertiary">
            {subtitle}
          </Text>
        ) : null}
      </VStack>
      {right}
      {showChevron && onPress ? (
        <ChevronRight size={18} color={theme.text.disabled} />
      ) : null}
    </HStack>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => haptic("select")}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.surface.sunken : "transparent",
        marginHorizontal: -8,
        paddingHorizontal: 8,
        borderRadius: 8,
      })}
    >
      {body}
    </Pressable>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.border.subtle }} />;
}
