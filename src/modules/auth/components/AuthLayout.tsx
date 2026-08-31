import React from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { gradients, radius, palette } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { Text, VStack, useBreakpoint } from "@shared/ui";

/**
 * The shell for every unauthenticated screen, and the ONE place a gradient
 * appears — before anyone has an account, a brand moment is the job; on a
 * working dashboard it would be decoration.
 *
 * Wide: brand panel left, form card right. Phone: the panel collapses to a
 * header so the form stays above the fold.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isWide } = useBreakpoint();

  const brandPanel = (
    <LinearGradient
      colors={[...gradients.hero]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={
        isWide
          ? { flex: 1, padding: 56, justifyContent: "center" }
          : { paddingTop: insets.top + 28, paddingBottom: 28, paddingHorizontal: 24 }
      }
    >
      <VStack gap={isWide ? 16 : 8} style={{ maxWidth: 460 }}>
        <Text variant="overline" style={{ color: palette.moss[200] }}>
          ParentAI
        </Text>
        <Text
          variant={isWide ? "display-lg" : "display-md"}
          style={{ color: "#FFFFFF" }}
        >
          {isWide ? "Teach your child tonight, in your own language." : "ParentAI"}
        </Text>
        {isWide ? (
          <Text variant="body-lg" style={{ color: palette.moss[100] }}>
            Thirty structured minutes. A script you can read aloud. Progress you
            can actually see.
          </Text>
        ) : null}
      </VStack>
    </LinearGradient>
  );

  const form = (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface.secondary }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        padding: isWide ? 48 : 20,
        paddingBottom: insets.bottom + 32,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 440,
          alignSelf: "center",
          backgroundColor: theme.surface.primary,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: theme.border.default,
          padding: isWide ? 32 : 22,
        }}
      >
        <VStack gap={6} style={{ marginBottom: 22 }}>
          <Text variant="h1">{title}</Text>
          {subtitle ? (
            <Text variant="body-sm" tone="tertiary">
              {subtitle}
            </Text>
          ) : null}
        </VStack>
        {children}
      </View>
      {footer ? (
        <View style={{ maxWidth: 440, alignSelf: "center", width: "100%", marginTop: 18 }}>
          {footer}
        </View>
      ) : null}
    </ScrollView>
  );

  const body = isWide ? (
    <View style={{ flex: 1, flexDirection: "row" }}>
      <View style={{ flex: 5 }}>{brandPanel}</View>
      <View style={{ flex: 6 }}>{form}</View>
    </View>
  ) : (
    <View style={{ flex: 1 }}>
      {brandPanel}
      {form}
    </View>
  );

  if (Platform.OS === "web") return body;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {body}
    </KeyboardAvoidingView>
  );
}
