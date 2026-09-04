import React, { useEffect, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { Check, X, Lightbulb } from "lucide-react-native";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { haptic } from "@shared/touchFeedback";
import { Text, TextField, Button, VStack, HStack } from "@shared/ui";
import type { LanguageCode } from "@shared/fonts";
import { grade, type Question, type Verdict } from "../grading";

/**
 * One question, asked and marked on the device.
 *
 * Graded locally so the child gets an answer instantly — during a 6-minute
 * phase, possibly with no network. The server re-grades for the record.
 */
export function QuestionCard({
  question,
  index,
  total,
  language,
  onAnswered,
}: {
  question: Question;
  index: number;
  total: number;
  language: LanguageCode;
  onAnswered: (result: {
    given: string;
    verdict: Verdict;
    answerMs: number;
  }) => void;
}) {
  const theme = useTheme();
  const [given, setGiven] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  /**
   * When this question appeared. Wall clock, so a backgrounded app does not
   * report a two-hour answer.
   *
   * Set in an effect, NOT as `useRef(Date.now())` — a ref's initial value is
   * computed during render, and reading the clock there is impure.
   *
   * No state reset is needed: `PhaseContent` keys this per question, so every
   * question is a fresh mount.
   */
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  const submit = (value: string) => {
    if (verdict) return;
    const v = grade(value, question);
    // Zero if somehow answered before the effect ran, rather than the fifty-odd
    // years that `Date.now() - 0` would record.
    const elapsed = shownAt.current ? Date.now() - shownAt.current : 0;
    const answerMs = Math.min(elapsed, 10 * 60 * 1000);
    setVerdict(v);
    /**
     * Haptics carry the verdict too. A child glancing away from the screen
     * still feels whether they were right, and the distinct patterns mean the
     * feedback does not depend on reading a colour.
     */
    haptic(v.correct ? "success" : "warning");
    onAnswered({ given: value, verdict: v, answerMs });
  };

  const isMultipleChoice = Boolean(question.options?.length);

  /**
   * Whether the expected answer is a number.
   *
   * Read from the answer the question already carries rather than from the
   * subject: "how many legs does an insect have" is a numeric Science answer,
   * and "write the formula" is a textual Maths one. Digits, a decimal point, a
   * fraction slash, a percent or a minus sign — and nothing else — count.
   */
  const expectsNumber =
    !isMultipleChoice &&
    /^[\d\s./%:+-]+$/.test(String(question.answer ?? "").trim());

  return (
    <VStack gap={14}>
      <HStack justify="space-between">
        <Text variant="overline" tone="tertiary">
          QUESTION {index + 1} OF {total}
        </Text>
        {question.skill ? (
          <Text
            variant="caption"
            tone="tertiary"
            numberOfLines={1}
            style={{ maxWidth: "55%" }}
          >
            {question.skill}
          </Text>
        ) : null}
      </HStack>

      <Text variant="body-lg" language={language} selectable>
        {question.prompt}
      </Text>

      {isMultipleChoice ? (
        <VStack gap={8}>
          {question.options!.map((option, i) => {
            const chosen = given === option;
            const isAnswer = verdict ? grade(option, question).correct : false;
            /**
             * After answering, the CORRECT option is highlighted as well as the
             * chosen one — a child who got it wrong needs to see what the right
             * answer was, not just that theirs was not it.
             */
            const state = !verdict
              ? "idle"
              : isAnswer
                ? "correct"
                : chosen
                  ? "wrong"
                  : "idle";

            const colors = {
              idle: {
                bg: theme.surface.primary,
                border: theme.border.strong,
                fg: theme.text.primary,
              },
              correct: {
                bg: theme.success.bg,
                border: theme.success.border,
                fg: theme.success.text,
              },
              wrong: {
                bg: theme.danger.bg,
                border: theme.danger.border,
                fg: theme.danger.text,
              },
            }[state];

            return (
              <Pressable
                key={option}
                disabled={Boolean(verdict)}
                onPress={() => {
                  setGiven(option);
                  submit(option);
                }}
                accessibilityRole="radio"
                accessibilityState={{
                  checked: chosen,
                  disabled: Boolean(verdict),
                }}
                aria-checked={chosen}
                aria-disabled={Boolean(verdict)}
                accessibilityLabel={option}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 52,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: radius.md,
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  variant="body"
                  style={{ color: colors.fg, flex: 1 }}
                  language={language}
                >
                  {option}
                </Text>
                {/* Never colour alone: the icon says it too. */}
                {state === "correct" ? (
                  <Check size={18} color={theme.success.text} />
                ) : null}
                {state === "wrong" ? (
                  <X size={18} color={theme.danger.text} />
                ) : null}
              </Pressable>
            );
          })}
        </VStack>
      ) : (
        <VStack gap={10}>
          <TextField
            value={given}
            onChangeText={setGiven}
            editable={!verdict}
            placeholder={expectsNumber ? "Type the number" : "Type the answer"}
            /**
             * The keyboard follows the ANSWER, not the subject.
             *
             * A child asked "what is 3/4 + 1/8" on a phone should get digits
             * without hunting for the number key; one asked "plants are known
             * as ___" needs letters. Choosing by subject instead is what put a
             * numeric pad under a Science question.
             *
             * `decimal-pad` rather than `numeric`: it carries the separators a
             * decimal or fraction answer needs and omits symbols that would
             * only produce ungradeable input.
             */
            keyboardType={expectsNumber ? "decimal-pad" : "default"}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => given.trim() && submit(given)}
            accessibilityLabel="Your answer"
          />
          {!verdict ? (
            <Button
              label="Check"
              onPress={() => submit(given)}
              disabled={!given.trim()}
              size="md"
            />
          ) : null}
        </VStack>
      )}

      {verdict ? (
        <Feedback verdict={verdict} question={question} language={language} />
      ) : null}
    </VStack>
  );
}

function Feedback({
  verdict,
  question,
  language,
}: {
  verdict: Verdict;
  question: Question;
  language: LanguageCode;
}) {
  const theme = useTheme();
  const tone = verdict.correct ? theme.success : theme.danger;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        padding: 14,
        borderRadius: radius.md,
        backgroundColor: tone.bg,
        borderWidth: 1,
        borderColor: tone.border,
      }}
    >
      <VStack gap={6}>
        <HStack gap={8}>
          {verdict.correct ? (
            <Check size={18} color={tone.text} />
          ) : (
            <X size={18} color={tone.text} />
          )}
          <Text variant="label-lg" style={{ color: tone.text }}>
            {verdict.correct ? "Correct" : "Not quite"}
          </Text>
        </HStack>

        {/**
         * The nudge, not a penalty. The child's arithmetic was right and only
         * the simplification is missing — phrased as an invitation, because a
         * correction here would teach them that being right is not enough.
         */}
        {verdict.needsSimplifying ? (
          <HStack gap={6}>
            <Lightbulb size={14} color={theme.accents.apricot.color} />
            <Text
              variant="body-sm"
              style={{ color: theme.accents.apricot.color, flex: 1 }}
            >
              Right — can you also write it in its simplest form?
            </Text>
          </HStack>
        ) : null}

        {!verdict.correct ? (
          <Text
            variant="body-sm"
            style={{ color: tone.text }}
            language={language}
          >
            The answer is {question.answer}.
          </Text>
        ) : null}

        {question.explanation ? (
          <Text variant="body-sm" tone="secondary" language={language}>
            {question.explanation}
          </Text>
        ) : null}
      </VStack>
    </View>
  );
}
