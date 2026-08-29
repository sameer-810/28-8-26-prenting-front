import React from "react";
import { View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CloudOff, RefreshCw } from "lucide-react-native";
import { useTheme } from "../useTheme";
import { Text } from "../ui/Text";
import { HStack } from "../ui/Stack";
import { useOfflineStore } from "./useOfflineStore";

/**
 * A thin strip under the status bar, shown only when there is something to say.
 *
 * The wording is the point. "No internet connection" is a complaint; this
 * product's promise is that a session keeps working, so the strip says what is
 * actually true — the work is saved and will sync. A parent mid-session should
 * feel informed, not interrupted.
 */
export function OfflineBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isOnline, isSyncing, pendingCount } = useOfflineStore();

  const show = !isOnline || (isSyncing && pendingCount > 0);
  if (!show) return null;

  const offline = !isOnline;
  const bg = offline ? theme.warning.bg : theme.info.bg;
  const fg = offline ? theme.warning.text : theme.info.text;

  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: bg,
        paddingTop: Platform.OS === "web" ? 8 : insets.top + 6,
        paddingBottom: 8,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: offline ? theme.warning.border : theme.info.border,
      }}
    >
      <HStack gap={8} justify="center">
        {offline ? <CloudOff size={14} color={fg} /> : <RefreshCw size={14} color={fg} />}
        <Text variant="caption" style={{ color: fg }}>
          {offline
            ? pendingCount > 0
              ? `Offline — ${pendingCount} update${pendingCount === 1 ? "" : "s"} saved, we'll sync when you're back`
              : "Offline — your session keeps working"
            : `Syncing ${pendingCount} update${pendingCount === 1 ? "" : "s"}…`}
        </Text>
      </HStack>
    </View>
  );
}
