import React from "react";
import { View } from "react-native";
import { useTheme } from "../useTheme";
import { Text } from "./Text";
import { VStack, HStack } from "./Stack";

/**
 * A single figure with its label.
 *
 * Colour is OPT-IN and defaults to none. A metric carrying no status meaning
 * gets no accent — that restraint is what stops a dashboard turning into a box
 * of highlighters, and it means the one number that IS coloured actually says
 * something.
 */
export function StatTile({
  value,
  label,
  accent,
  icon,
  hint,
}: {
  value: string | number;
  label: string;
  accent?: "moss" | "apricot" | "blue" | "clay" | "neutral";
  icon?: React.ReactNode;
  hint?: string;
}) {
  const theme = useTheme();
  const color = accent ? theme.accents[accent].color : theme.text.primary;

  return (
    <VStack gap={2} style={{ flex: 1, minWidth: 78 }}>
      <HStack gap={6}>
        {icon}
        <Text variant="display-sm" numeric style={{ color }}>
          {value}
        </Text>
      </HStack>
      <Text variant="label-sm" tone="tertiary">
        {label}
      </Text>
      {hint ? (
        <Text variant="caption" tone="disabled">
          {hint}
        </Text>
      ) : null}
    </VStack>
  );
}

/** A row of tiles, evenly divided, with hairlines between them. */
export function StatRow({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const items = React.Children.toArray(children);
  return (
    <HStack align="flex-start">
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 ? (
            <View
              style={{
                width: 1,
                alignSelf: "stretch",
                backgroundColor: theme.border.subtle,
                marginHorizontal: 12,
              }}
            />
          ) : null}
          {child}
        </React.Fragment>
      ))}
    </HStack>
  );
}
