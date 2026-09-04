import React from "react";
import { LayoutChangeEvent, View } from "react-native";
import { useTheme } from "../useTheme";
import { Text } from "./Text";
import { VStack, HStack } from "./Stack";
import { TILE_MIN_WIDTH, statRowFits } from "./statRowLayout";

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
    <VStack gap={2} style={{ flex: 1, minWidth: TILE_MIN_WIDTH }}>
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
        // A hint is real content — "30 days", "Tap a bar for that day." — so it
        // takes the tertiary tone, which clears AA. `disabled` does not.
        <Text variant="caption" tone="tertiary">
          {hint}
        </Text>
      ) : null}
    </VStack>
  );
}

/**
 * A row of tiles, evenly divided, with hairlines between them — falling back to
 * a two-column grid when they will not fit.
 *
 * Four tiles do not fit a 390pt phone: each needs TILE_MIN_WIDTH to hold a
 * figure like "81.5h" above a label like "Accuracy", and four of those plus
 * their dividers exceed the card. `flex: 1` cannot rescue that, because minWidth
 * wins over shrinking — so the row used to run off the edge of the screen and
 * take the fourth number with it, silently and only on a phone.
 */
export function StatRow({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const items = React.Children.toArray(children);
  const [width, setWidth] = React.useState(0);
  const onLayout = React.useCallback(
    (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width),
    [],
  );

  if (!statRowFits(items.length, width)) {
    return (
      <View
        onLayout={onLayout}
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          rowGap: 14,
          columnGap: 12,
        }}
      >
        {items.map((child, i) => (
          <View key={i} style={{ flexBasis: "46%", flexGrow: 1 }}>
            {child}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View
      onLayout={onLayout}
      style={{ flexDirection: "row", alignItems: "flex-start" }}
    >
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
    </View>
  );
}
