import React from "react";
import { Pressable, View } from "react-native";
import { Volume2, VolumeX } from "lucide-react-native";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { useFontStore, type LanguageCode } from "@shared/fonts";
import { useSpeech } from "@shared/useSpeech";
import { TappableText } from "./TappableText";
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
  parentSpeech,
  childSpeech,
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
  /**
   * The same words as plain strings, for the read-aloud button. The columns
   * take nodes so they can carry emphasis and tappable words, and a speech
   * engine cannot read a React tree — so the caller passes the text too.
   */
  parentSpeech?: string;
  childSpeech?: string;
}) {
  const theme = useTheme();
  const speech = useSpeech();
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
    readAloudText?: string,
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
      <HStack gap={6} style={{ marginBottom: 8 }} justify="space-between">
        <HStack gap={6}>
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
            // Honest about the font still arriving rather than silently
            // rendering in a fallback face the parent may find harder to read.
            <Text variant="caption" tone="tertiary">
              loading script…
            </Text>
          ) : null}
        </HStack>

        {/**
         * Read aloud. Offered per column, in that column's language, because
         * the two halves are the point: a parent who reads Marathi but not
         * English needs the child's column spoken, and a parent who reads
         * neither comfortably needs their own.
         *
         * Hidden entirely when the platform has no voice — a button that does
         * nothing is worse than an absent one.
         */}
        {speech.supported && readAloudText ? (
          <Pressable
            onPress={() =>
              speech.speaking
                ? speech.stop()
                : speech.speak(readAloudText, language)
            }
            accessibilityRole="button"
            accessibilityLabel={
              speech.speaking ? "Stop reading" : `Read the ${label} text aloud`
            }
            style={{
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              marginTop: -6,
              marginRight: -4,
            }}
          >
            {speech.speaking ? (
              <VolumeX size={16} color={theme.text.tertiary} />
            ) : (
              <Volume2
                size={16}
                color={
                  which === "parent"
                    ? theme.accents.moss.color
                    : theme.text.tertiary
                }
              />
            )}
          </Pressable>
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
    parentSpeech,
  );
  const childCol = showChild
    ? column(
        "child",
        childLabel || "FOR YOUR CHILD",
        childLanguage,
        childContent,
        childSpeech,
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
  /**
   * When given, every substantial word becomes tappable for a definition and a
   * voice button appears. Omitted where there is no child in scope — the
   * lookup is written for a specific grade and pair of languages.
   */
  childId,
  parentLanguage,
}: {
  text: string;
  language: LanguageCode;
  size?: "body" | "body-lg";
  childId?: string;
  parentLanguage?: LanguageCode;
}) {
  const theme = useTheme();
  const speech = useSpeech();

  const body = childId ? (
    <TappableText
      text={text}
      childId={childId}
      language={language}
      parentLanguage={parentLanguage}
      variant={size}
      style={{ letterSpacing: 0.1 }}
    />
  ) : (
    <Text
      variant={size}
      language={language}
      selectable
      style={{ letterSpacing: 0.1 }}
    >
      {text}
    </Text>
  );

  if (!speech.supported) return body;

  return (
    <VStack gap={10}>
      {body}
      {/**
       * Under the passage, not beside the heading: this is an action on the
       * text a parent has just decided they cannot read comfortably, and it
       * belongs where their eye already is.
       */}
      <HStack gap={6}>
        <Pressable
          onPress={() =>
            speech.speaking ? speech.stop() : speech.speak(text, language)
          }
          accessibilityRole="button"
          accessibilityLabel={
            speech.speaking ? "Stop reading aloud" : "Read this aloud"
          }
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            minHeight: 32,
            paddingVertical: 4,
            paddingRight: 8,
          }}
        >
          {speech.speaking ? (
            <VolumeX size={15} color={theme.text.accent} />
          ) : (
            <Volume2 size={15} color={theme.text.accent} />
          )}
          <Text variant="label-sm" tone="accent">
            {speech.speaking ? "Stop" : "Read it to me"}
          </Text>
        </Pressable>
      </HStack>
    </VStack>
  );
}
