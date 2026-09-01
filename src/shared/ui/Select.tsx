import React, { useState } from "react";
import { View, Pressable, Modal, ScrollView, Platform } from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { radius } from "../designSystem";
import { useTheme } from "../useTheme";
import { haptic } from "../touchFeedback";
import { Text } from "./Text";
import { VStack, HStack } from "./Stack";
import { useControlHeight } from "./useBreakpoint";

export interface SelectOption {
  value: string;
  label: string;
  /** Shown under the label — a board's full name, a language's endonym. */
  hint?: string;
}

/**
 * A picker that is one control on both platforms.
 *
 * Deliberately a modal sheet rather than the native platform picker: the native
 * pickers look and behave differently on iOS, Android and the web, and the
 * onboarding flow this is used in shows three of them in a row. Consistency
 * matters more here than platform idiom.
 */
export function Select({
  label,
  hint,
  error,
  required,
  value,
  options,
  placeholder = "Select…",
  onChange,
  disabled,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  value?: string;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const height = useControlHeight();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      {label ? (
        <HStack gap={4} style={{ marginBottom: 6 }}>
          <Text variant="label" tone="secondary">
            {label}
          </Text>
          {required ? (
            <Text variant="label" tone="danger">
              *
            </Text>
          ) : null}
        </HStack>
      ) : null}

      <Pressable
        onPress={() => {
          if (disabled) return;
          haptic("select");
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={
          label ? `${label}: ${selected?.label || placeholder}` : placeholder
        }
        accessibilityState={{ disabled: Boolean(disabled), expanded: open }}
        aria-expanded={open}
        aria-disabled={Boolean(disabled)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: height,
          paddingHorizontal: 14,
          backgroundColor: disabled
            ? theme.surface.sunken
            : theme.surface.primary,
          borderWidth: 1,
          borderColor: error ? theme.danger.text : theme.border.strong,
          borderRadius: radius.md,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Text
          variant="body"
          tone={selected ? "primary" : "disabled"}
          numberOfLines={1}
        >
          {selected?.label || placeholder}
        </Text>
        <ChevronDown size={18} color={theme.text.tertiary} />
      </Pressable>

      {error ? (
        <Text variant="caption" tone="danger" style={{ marginTop: 5 }}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="tertiary" style={{ marginTop: 5 }}>
          {hint}
        </Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType={Platform.OS === "web" ? "fade" : "slide"}
        onRequestClose={() => setOpen(false)}
      >
        {/* The scrim closes the sheet — expected on every platform, and the
            only escape on Android without a hardware back gesture. */}
        <Pressable
          onPress={() => setOpen(false)}
          accessibilityLabel="Close"
          style={{
            flex: 1,
            backgroundColor: "rgba(31,28,23,0.45)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.surface.primary,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingTop: 8,
              paddingBottom: 24,
              maxHeight: "70%",
              // Centre it as a dialog on wide layouts rather than a phone sheet
              // pinned to the bottom of a 1400px window.
              alignSelf: "center",
              width: "100%",
              maxWidth: 520,
              borderRadius: Platform.OS === "web" ? radius.xl : undefined,
              marginBottom: Platform.OS === "web" ? 40 : 0,
            }}
          >
            <View
              style={{
                alignSelf: "center",
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.border.strong,
                marginBottom: 12,
              }}
            />
            {label ? (
              <Text
                variant="h3"
                style={{ paddingHorizontal: 20, paddingBottom: 8 }}
              >
                {label}
              </Text>
            ) : null}
            <ScrollView>
              {options.map((o) => {
                const isSelected = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => {
                      haptic("select");
                      onChange(o.value);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    aria-selected={isSelected}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      backgroundColor: isSelected
                        ? theme.accents.moss.tint
                        : "transparent",
                    }}
                  >
                    <VStack gap={2} flex={1}>
                      <Text
                        variant="body"
                        tone={isSelected ? "accent" : "primary"}
                      >
                        {o.label}
                      </Text>
                      {o.hint ? (
                        <Text variant="caption" tone="tertiary">
                          {o.hint}
                        </Text>
                      ) : null}
                    </VStack>
                    {isSelected ? (
                      <Check size={18} color={theme.text.accent} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
