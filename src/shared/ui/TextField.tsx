import React, { useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  TextInputProps,
  ViewStyle,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { radius, typography } from "../designSystem";
import { useTheme } from "../useTheme";
import { Text } from "./Text";
import { useControlHeight } from "./useBreakpoint";

interface Props extends Omit<TextInputProps, "style"> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  multilineRows?: number;
}

export function TextField({
  label,
  hint,
  error,
  required,
  leftIcon,
  rightIcon,
  containerStyle,
  multilineRows,
  secureTextEntry,
  ...rest
}: Props) {
  const theme = useTheme();
  const height = useControlHeight();
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);

  const isPassword = Boolean(secureTextEntry);
  const borderColor = error
    ? theme.danger.text
    : focused
      ? theme.border.focus
      : theme.border.strong;

  return (
    <View style={containerStyle}>
      {label ? (
        <View style={{ flexDirection: "row", gap: 4, marginBottom: 6 }}>
          <Text variant="label" tone="secondary">
            {label}
          </Text>
          {required ? (
            <Text variant="label" tone="danger" accessibilityLabel="required">
              *
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: multilineRows ? "flex-start" : "center",
          gap: 10,
          minHeight: multilineRows ? undefined : height,
          paddingHorizontal: 14,
          paddingVertical: multilineRows ? 12 : 0,
          backgroundColor: theme.surface.primary,
          borderColor,
          /**
           * The focus ring thickens rather than only changing colour. Colour
           * alone fails for the ~8% of men with a colour-vision deficiency, and
           * focus is the one state a keyboard user navigates entirely by.
           */
          borderWidth: focused ? 2 : 1,
          borderRadius: radius.md,
          // Compensate so the field does not jump 1px when it gains focus.
          margin: focused ? 0 : 1,
        }}
      >
        {leftIcon}
        <TextInput
          {...rest}
          secureTextEntry={isPassword && !reveal}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          multiline={Boolean(multilineRows)}
          numberOfLines={multilineRows}
          placeholderTextColor={theme.text.disabled}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          style={
            {
              flex: 1,
              color: theme.text.primary,
              fontFamily: typography.body.default.fontFamily,
              fontSize: typography.body.default.fontSize,
              minHeight: multilineRows ? multilineRows * 22 : undefined,
              textAlignVertical: multilineRows ? "top" : "center",
              // Removes the default focus outline on web; ours is the border.
              outlineStyle: "none",
            } as never
          }
        />
        {isPassword ? (
          <Pressable
            onPress={() => setReveal((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={reveal ? "Hide password" : "Show password"}
            /**
             * hitSlop alone is not enough: react-native-web does not implement
             * it, so on the web build the reveal toggle was an 18x18 target —
             * the smallest control in the product, on the sign-in screen. The
             * explicit box gives every platform a real 44x44; hitSlop stays for
             * native, where it costs nothing.
             */
            hitSlop={10}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              marginRight: -8,
            }}
          >
            {reveal ? (
              <EyeOff size={18} color={theme.text.tertiary} />
            ) : (
              <Eye size={18} color={theme.text.tertiary} />
            )}
          </Pressable>
        ) : (
          rightIcon
        )}
      </View>

      {error ? (
        <Text variant="caption" tone="danger" style={{ marginTop: 5 }}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="tertiary" style={{ marginTop: 5 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
