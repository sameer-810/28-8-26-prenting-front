import React from "react";
import { View, ActivityIndicator } from "react-native";
import { AlertTriangle, WifiOff } from "lucide-react-native";
import { radius, palette } from "../designSystem";
import { useTheme } from "../useTheme";
import { Text } from "./Text";
import { VStack } from "./Stack";
import { Button } from "./Button";

/**
 * Empty, error and loading states.
 *
 * Grouped in one file because they are one decision: every list and every
 * async surface in the app needs all three, and keeping them together is what
 * stops a screen shipping with only the happy path — the most common way a
 * product feels unfinished.
 */

interface EmptyProps {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: EmptyProps) {
  return (
    <VStack
      gap={10}
      align="center"
      style={{ paddingVertical: 44, paddingHorizontal: 24 }}
    >
      {icon}
      <Text variant="h3" align="center">
        {title}
      </Text>
      {body ? (
        <Text
          variant="body-sm"
          tone="tertiary"
          align="center"
          style={{ maxWidth: 320 }}
        >
          {body}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          fullWidth={false}
          style={{ marginTop: 8 }}
        />
      ) : null}
    </VStack>
  );
}

interface ErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  /** Offline gets its own icon and wording — it is not the app's fault. */
  offline?: boolean;
}

export function ErrorState({ title, message, onRetry, offline }: ErrorProps) {
  const theme = useTheme();
  return (
    <VStack
      gap={10}
      align="center"
      style={{ paddingVertical: 40, paddingHorizontal: 24 }}
    >
      {offline ? (
        <WifiOff size={28} color={theme.text.tertiary} />
      ) : (
        <AlertTriangle size={28} color={theme.danger.text} />
      )}
      <Text variant="h3" align="center">
        {title || (offline ? "You're offline" : "That didn't work")}
      </Text>
      <Text
        variant="body-sm"
        tone="tertiary"
        align="center"
        style={{ maxWidth: 340 }}
      >
        {message ||
          (offline
            ? "We'll pick this up as soon as you're back online. Anything you've done is saved."
            : "Please try again.")}
      </Text>
      {onRetry ? (
        <Button
          label="Try again"
          variant="secondary"
          onPress={onRetry}
          fullWidth={false}
          style={{ marginTop: 8 }}
        />
      ) : null}
    </VStack>
  );
}

/**
 * A shimmerless skeleton.
 *
 * Deliberately static: an animated shimmer is motion for its own sake, it costs
 * a frame budget on the cheap Android phones this product runs on, and it
 * cannot be shown to somebody who has asked for reduced motion — so a
 * calm tinted block is both simpler and more honest.
 */
export function Skeleton({
  width,
  height = 16,
  style,
}: {
  width?: number | string;
  height?: number;
  style?: object;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel="Loading"
      style={[
        {
          width: (width as never) ?? "100%",
          height,
          borderRadius: radius.sm,
          backgroundColor: theme.surface.sunken,
        },
        style,
      ]}
    />
  );
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <VStack gap={12} align="center" style={{ paddingVertical: 48 }}>
      <ActivityIndicator color={palette.moss[600]} />
      {label ? (
        <Text variant="body-sm" tone="tertiary">
          {label}
        </Text>
      ) : null}
    </VStack>
  );
}
