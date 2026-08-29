import React from "react";
import { View, ViewStyle, StyleProp } from "react-native";

interface Props {
  gap?: number;
  align?: ViewStyle["alignItems"];
  justify?: ViewStyle["justifyContent"];
  wrap?: boolean;
  flex?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Layout primitives.
 *
 * `gap` rather than margins on children: margin collapses awkwardly around
 * conditionally-rendered elements, so a row that sometimes hides its last item
 * ends up with a trailing space nobody asked for.
 */
export function VStack({ gap = 0, align, justify, flex, style, children }: Props) {
  return (
    <View
      style={[
        { flexDirection: "column", gap, alignItems: align, justifyContent: justify, flex },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function HStack({
  gap = 0,
  align = "center",
  justify,
  wrap,
  flex,
  style,
  children,
}: Props) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          gap,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? "wrap" : "nowrap",
          flex,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export const Stack = VStack;

/** Pushes siblings apart in a row. */
export function Spacer({ size }: { size?: number }) {
  return <View style={size ? { width: size, height: size } : { flex: 1 }} />;
}
