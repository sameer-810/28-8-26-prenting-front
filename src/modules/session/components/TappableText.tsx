import React, { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Volume2, X } from "lucide-react-native";
import { apiClient, unwrap } from "@api/apiClient";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { useSpeech } from "@shared/useSpeech";
import { Text, VStack, HStack, Button } from "@shared/ui";
import type { LanguageCode } from "@shared/fonts";

interface Definition {
  available: boolean;
  word: string;
  definition?: string;
  definitionParent?: string;
  example?: string;
}

/**
 * Text whose words can be tapped for a definition.
 *
 * A child reading a session hits a word they do not know and, without this,
 * either asks a parent who may not know it either or quietly skips it. Tapping
 * is the cheapest possible way to ask.
 *
 * Rendered as one `Text` with nested `Text` children rather than a wrapping row
 * of views, so the passage still wraps, justifies and honours the script's line
 * height — a Devanagari paragraph broken into per-word boxes looks wrong in a
 * way a Latin one does not.
 *
 * Only words worth looking up are tappable. Making every "the" and "है" a
 * touch target turns a paragraph into a minefield and buries the words that
 * matter.
 */
export function TappableText({
  text,
  childId,
  language = "en",
  parentLanguage,
  style,
  variant = "body",
}: {
  text: string;
  childId: string;
  language?: LanguageCode;
  parentLanguage?: LanguageCode;
  style?: object;
  variant?: "body" | "body-lg" | "body-sm";
}) {
  const theme = useTheme();
  const speech = useSpeech();
  const [lookup, setLookup] = useState<Definition | null>(null);
  const [loading, setLoading] = useState(false);

  const define = async (raw: string) => {
    const word = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (word.length < 3) return;
    setLoading(true);
    setLookup({ available: true, word });
    try {
      const data = await unwrap<Definition>(
        apiClient.post(`/curriculum/${childId}/define`, {
          word,
          // The sentence decides the sense: "table" in a maths lesson is not
          // the furniture.
          sentence: text.slice(0, 400),
        }),
      );
      setLookup(data);
    } catch {
      setLookup({ available: false, word });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Split on whitespace, keeping the punctuation attached so the passage reads
   * normally; the tap handler trims it before asking.
   */
  const tokens = text.split(/(\s+)/);

  return (
    <>
      <Text variant={variant} style={style}>
        {tokens.map((token, i) => {
          const bare = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
          const lookupable = bare.length >= 4 && /\p{L}/u.test(bare);
          if (!lookupable) return token;
          return (
            <Text
              key={`${token}-${i}`}
              variant={variant}
              onPress={() => void define(token)}
              // No underline or colour: a paragraph where a third of the words
              // are decorated is harder to read than one where none are, and
              // the affordance is discoverable the first time a child tries.
              //
              // "link" rather than "button" because a nested Text accepts only
              // the narrower role set — and of those it is the one that tells a
              // screen reader this word goes somewhere.
              accessibilityRole="link"
              accessibilityLabel={`${bare} — tap for the meaning`}
            >
              {token}
            </Text>
          );
        })}
      </Text>

      <Modal
        visible={Boolean(lookup)}
        transparent
        animationType="slide"
        onRequestClose={() => setLookup(null)}
      >
        <Pressable
          onPress={() => setLookup(null)}
          style={{
            flex: 1,
            backgroundColor: "rgba(31,28,23,0.45)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.surface.primary,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: 20,
              paddingBottom: 32,
              maxHeight: "70%",
              alignSelf: "center",
              width: "100%",
              maxWidth: 560,
            }}
          >
            <VStack gap={14}>
              <HStack justify="space-between">
                <Text variant="h3">{lookup?.word}</Text>
                <Pressable
                  onPress={() => setLookup(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={{
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: -10,
                    marginTop: -10,
                  }}
                >
                  <X size={18} color={theme.text.secondary} />
                </Pressable>
              </HStack>

              {loading ? (
                <Text variant="body" tone="tertiary">
                  Looking it up…
                </Text>
              ) : lookup?.available === false ? (
                <Text variant="body" tone="tertiary">
                  We couldn&apos;t look that word up just now. Try again in a
                  moment.
                </Text>
              ) : (
                <VStack gap={12}>
                  {lookup?.definition ? (
                    <VStack gap={6}>
                      <Text variant="body">{lookup.definition}</Text>
                      {speech.supported ? (
                        <Button
                          label={speech.speaking ? "Stop" : "Read it aloud"}
                          variant="secondary"
                          size="sm"
                          icon={<Volume2 size={15} color={theme.text.accent} />}
                          onPress={() =>
                            speech.speaking
                              ? speech.stop()
                              : speech.speak(lookup.definition ?? "", language)
                          }
                        />
                      ) : null}
                    </VStack>
                  ) : null}

                  {/* The parent's language, so they can say it themselves. */}
                  {lookup?.definitionParent &&
                  parentLanguage &&
                  parentLanguage !== language ? (
                    <View
                      style={{
                        backgroundColor: theme.accents.moss.tint,
                        borderRadius: radius.md,
                        padding: 12,
                      }}
                    >
                      <VStack gap={6}>
                        <Text variant="overline" tone="tertiary">
                          FOR YOU
                        </Text>
                        <Text variant="body-sm">{lookup.definitionParent}</Text>
                      </VStack>
                    </View>
                  ) : null}

                  {lookup?.example ? (
                    <VStack gap={4}>
                      <Text variant="overline" tone="tertiary">
                        LIKE THIS
                      </Text>
                      <Text variant="body-sm" tone="secondary">
                        {lookup.example}
                      </Text>
                    </VStack>
                  ) : null}
                </VStack>
              )}
            </VStack>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
