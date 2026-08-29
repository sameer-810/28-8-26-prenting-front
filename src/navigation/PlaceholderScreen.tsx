import React from "react";
import { Hammer } from "lucide-react-native";
import { useTheme } from "@shared/useTheme";
import { Screen, EmptyState } from "@shared/ui";

/**
 * A named, honest placeholder for a section that is scheduled but not built.
 *
 * Deliberately explicit about WHICH phase delivers it, rather than a blank
 * screen or a spinner that never resolves. A section that looks broken and one
 * that says "arriving in Phase 6" are very different things to hand someone
 * reviewing the build.
 */
export function PlaceholderScreen({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <Screen title={title}>
      <EmptyState
        icon={<Hammer size={26} color={theme.text.tertiary} />}
        title="Not built yet"
        body={body}
      />
    </Screen>
  );
}
