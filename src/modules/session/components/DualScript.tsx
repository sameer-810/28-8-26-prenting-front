import React from "react";
import { View } from "react-native";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { useFontStore, type LanguageCode } from "@shared/fonts";
import { Text } from "@shared/ui/Text";
import { VStack, HStack } from "@shared/ui/Stack";
import { useBreakpoint } from "@shared/ui/useBreakpoint";

/**
 * A parent column in the home language beside a child column in the school
 * medium. Two things it must not get wrong:
 *
 *   1. The PARENT / CHILD labels are permanent, not decorative. On a phone the
 *      columns stack, and a stacked pair without labels is two paragraphs.
 *   2. Each column carries its own face, line-height and direction — Devanagari
 *      clips at Latin leading, Nastaliq needs more, and Urdu mirrors.
 */
export function DualScript({
  parentLanguage,
  childLanguage,
  parentLabel,
  childLabel,
  parentContent,
  childContent,
  /** Suppresses the child column when a phase is parent-only. */
  parentOnly,
}: {
  parentLanguage: LanguageCode;
  childLanguage: LanguageCode;
  parentLabel?: string;
  childLabel?: string;
  parentContent: React.ReactNode;
  childContent?: React.ReactNode;
  parentOnly?: boolean;
}) {
  const theme = useTheme();
  const { isWide } = useBreakpoint();
  const fontsReady = useFontStore((s) => s.isReady(parentLanguage));

  const showChild = !parentOnly && Boolean(childContent);
  const sameLanguage = parentLanguage === childLanguage;

  /**
   * When both languages are the same there is nothing to distinguish, so the
   * labelled split is dropped entirely. A household in an English-medium school
   * who also speaks English at home should not be shown a feature that solves a
   * problem they do not have.
   */
  if (sameLanguage && showChild) {
    return (
      <VStack gap={14}>
        <View>{parentContent}</View>
        <View>{childContent}</View>
      </VStack>
    );
  }

  const column = (
    which: "parent" | "child",
    label: string,
    language: LanguageCode,
    content: React.ReactNode,
  ) => (
    <View
      style={{
        flex: isWide && showChild ? 1 : undefined,
        backgroundColor:
          which === "parent" ? theme.accents.moss.tint : theme.surface.sunken,
        borderRadius: radius.md,
        padding: 14,
        borderWidth: 1,
        borderColor:
          which === "parent" ? theme.brand[200] : theme.border.subtle,
      }}
    >
      <HStack gap={6} style={{ marginBottom: 8 }}>
        <Text
          variant="overline"
          style={{
            color:
              which === "parent"
                ? theme.accents.moss.color
                : theme.text.tertiary,
          }}
        >
          {label}
        </Text>
        {which === "parent" && !fontsReady && language !== "en" ? (
          // Honest about the font still arriving rather than silently rendering
          // in a fallback face the parent may find harder to read.
          <Text variant="caption" tone="disabled">
            loading script…
          </Text>
        ) : null}
      </HStack>
      {content}
    </View>
  );

  const parentCol = column(
    "parent",
    parentLabel || "FOR YOU",
    parentLanguage,
    parentContent,
  );
  const childCol = showChild
    ? column(
        "child",
        childLabel || "FOR YOUR CHILD",
        childLanguage,
        childContent,
      )
    : null;

  if (!showChild) return parentCol;

  /**
   * Side by side only where there is genuinely room. Two 45%-wide columns of
   * Devanagari on a 390px phone gives about four words a line, which is
   * unreadable — stacking is not a degraded version of the desktop layout, it
   * is the correct one for that width.
   */
  return isWide ? (
    <HStack gap={12} align="stretch">
      {parentCol}
      {childCol}
    </HStack>
  ) : (
    <VStack gap={10}>
      {parentCol}
      {childCol}
    </VStack>
  );
}

/**
 * A block of text to be read ALOUD.
 *
 * Larger leading and a generous measure, because the parent is holding a phone
 * and looking up at their child between sentences — they need to find their
 * place again each time. Selectable so a phrase can be copied out.
 */
export function ReadAloud({
  text,
  language,
  size = "body-lg",
}: {
  text: string;
  language: LanguageCode;
  size?: "body" | "body-lg";
}) {
  return (
    <Text
      variant={size}
      language={language}
      selectable
      style={{ letterSpacing: 0.1 }}
    >
      {text}
    </Text>
  );
}
