import React from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { layout, palette } from "../designSystem";
import { useTheme } from "../useTheme";
import { useBreakpoint } from "./useBreakpoint";
import { Text } from "./Text";
import { VStack } from "./Stack";

interface Props {
  title?: string;
  subtitle?: string;
  overline?: string;
  right?: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Pinned to the screen, outside the scroller — for something that must stay
   * put while the page moves under it.
   *
   * Passing such a thing as a child does not work: it lands inside the
   * ScrollView, where `position: absolute; bottom: 0` anchors to the bottom of
   * the CONTENT rather than the viewport, so it sits below the fold and is
   * never seen.
   */
  overlay?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The standard content container.
 *
 * Centres to a max width on wide layouts and pads consistently. The surrounding
 * shell (sidebar or tab bar) belongs to the navigator; Screen handles only the
 * inner content region.
 */
export function Screen({
  title,
  subtitle,
  overline,
  right,
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
  overlay,
  children,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isWide, gutter, width } = useBreakpoint();

  /**
   * Reserve the room the phone's floating capture button occupies. It is
   * positioned absolutely, so it takes no layout space and simply covers
   * whatever is beneath it — which, on a list, is the last row.
   */
  const bottomPad = isWide
    ? Math.max(insets.bottom, 24) + 8
    : layout.tabBarClearance + insets.bottom;

  // On a phone, actions beside the title squeeze the subtitle into a ragged
  // column — drop them onto their own line instead.
  const stackHeader = width < 700;

  const header =
    title || right ? (
      <View
        style={{
          flexDirection: stackHeader ? "column" : "row",
          alignItems: stackHeader ? "stretch" : "flex-end",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <VStack gap={2} flex={stackHeader ? undefined : 1}>
          {overline && isWide ? (
            <Text variant="overline" tone="tertiary">
              {overline}
            </Text>
          ) : null}
          {title ? <Text variant="h1">{title}</Text> : null}
          {subtitle ? (
            <Text variant="body-sm" tone="tertiary">
              {subtitle}
            </Text>
          ) : null}
        </VStack>
        {right ? <View>{right}</View> : null}
      </View>
    ) : null;

  const inner = (
    <View
      style={[
        { width: "100%", maxWidth: layout.contentMaxWidth, alignSelf: "center" },
        contentStyle,
      ]}
    >
      {header}
      {children}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface.secondary }}
      contentContainerStyle={{ padding: gutter, paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
      /**
       * Without this the first tap while the keyboard is open only dismisses
       * it — every button below a text field needs tapping twice.
       */
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={palette.moss[600]}
            colors={[palette.moss[600]]}
          />
        ) : undefined
      }
    >
      {inner}
    </ScrollView>
  ) : (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.surface.secondary,
        padding: gutter,
        paddingBottom: bottomPad,
      }}
    >
      {inner}
    </View>
  );

  const withOverlay = overlay ? (
    <View style={{ flex: 1 }}>
      {body}
      {overlay}
    </View>
  ) : (
    body
  );

  /**
   * Keyboard handling belongs here rather than in each screen — the alternative
   * is asking every form in the app to remember, and the one that forgets has
   * its fields hidden under the keyboard. Skipped on web: there is no soft
   * keyboard, and the extra flex container only complicates the desktop layout.
   */
  if (Platform.OS === "web") return withOverlay;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {withOverlay}
    </KeyboardAvoidingView>
  );
}
