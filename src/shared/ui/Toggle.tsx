import React from "react";
import { Pressable, View } from "react-native";
import { radius } from "../designSystem";
import { useTheme } from "../useTheme";
import { haptic, prefersReducedMotion } from "../touchFeedback";
import { Text } from "./Text";
import { VStack, HStack } from "./Stack";

/**
 * A labelled switch.
 *
 * Custom rather than RN's `Switch` for the same reason as the tab bar: the
 * platform switch cannot take the warm palette, and its iOS and Android forms
 * differ enough that a settings list built from them looks assembled rather
 * than designed.
 *
 * The whole row is the target, not just the switch — a 51×31 control is a
 * mis-tap waiting to happen, and the label is what the parent is actually
 * reading when they reach for it.
 */
export function Toggle({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const reduceMotion = prefersReducedMotion();

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        haptic("select");
        onChange(!value);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      /**
       * `aria-checked` is passed EXPLICITLY as well as via accessibilityState.
       *
       * React Native Web does not map `accessibilityState.checked` onto a
       * Pressable — verified in the built bundle, where the element carried
       * `role="switch"` and no `aria-checked` at all. A switch whose state is
       * invisible to the accessibility tree is announced as "switch" with no
       * indication of on or off, which is worse than having no role.
       *
       * `accessibilityState` is kept for iOS and Android, where it is the
       * prop that works.
       */
      aria-checked={value}
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <HStack gap={14} style={{ minHeight: 52, paddingVertical: 8 }}>
        <VStack gap={2} flex={1}>
          <Text variant="label-lg">{label}</Text>
          {hint ? (
            <Text variant="caption" tone="tertiary">
              {hint}
            </Text>
          ) : null}
        </VStack>

        <View
          style={{
            width: 46,
            height: 28,
            borderRadius: radius.full,
            backgroundColor: value ? theme.brand[600] : theme.surface.sunken,
            borderWidth: 1,
            borderColor: value ? theme.brand[600] : theme.border.strong,
            justifyContent: "center",
            paddingHorizontal: 3,
          }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: radius.full,
              backgroundColor: value ? "#FFFFFF" : theme.text.disabled,
              // Position rather than transform, so there is nothing to animate
              // and nothing to suppress under reduced motion.
              alignSelf: value ? "flex-end" : "flex-start",
              ...(reduceMotion ? {} : theme.shadows.xs),
            }}
          />
        </View>
      </HStack>
    </Pressable>
  );
}
