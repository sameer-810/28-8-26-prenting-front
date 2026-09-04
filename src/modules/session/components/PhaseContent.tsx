import React from "react";
import { View } from "react-native";
import {
  AlertTriangle,
  MessageCircle,
  PenLine,
  Sparkles,
} from "lucide-react-native";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { Text, Card, VStack, HStack, LoadingState } from "@shared/ui";
import type { LanguageCode } from "@shared/fonts";
import { DualScript, ReadAloud } from "./DualScript";
import { QuestionCard } from "./QuestionCard";
import type { StudyPlan } from "../api/sessionApi";
import type { Verdict } from "../grading";

/**
 * The content of each of the five phases.
 *
 * Phases 1, 2 and 5 address the PARENT; phases 3 and 4 address the child. That
 * split is the Parent Guidance Layer, and it is why the components differ
 * rather than being one templated list — a teaching script and a question are
 * not the same kind of object and should not look like it.
 */

export function ConceptPhase({ plan }: { plan: StudyPlan }) {
  const theme = useTheme();
  const parentLang = plan.languages.parent.code as LanguageCode;

  return (
    <VStack gap={16}>
      <Card>
        <VStack gap={12}>
          <Text variant="overline" tone="tertiary">
            READ THIS ALOUD
          </Text>
          <ReadAloud
            text={plan.concept.script}
            language={parentLang}
            childId={plan.childId}
            childLanguage={plan.languages.child.code as LanguageCode}
            parentLanguage={parentLang}
          />
        </VStack>
      </Card>

      {plan.concept.analogies.length > 0 ? (
        <Card tone="sunken">
          <VStack gap={10}>
            <Text variant="label" tone="secondary">
              Ways to explain it
            </Text>
            {plan.concept.analogies.map((analogy, i) => (
              <HStack key={i} gap={10} align="flex-start">
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: radius.full,
                    backgroundColor: theme.accents.moss.tint,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 2,
                  }}
                >
                  <Text variant="label-sm" tone="accent">
                    {i + 1}
                  </Text>
                </View>
                <Text variant="body" language={parentLang} style={{ flex: 1 }}>
                  {analogy}
                </Text>
              </HStack>
            ))}
          </VStack>
        </Card>
      ) : null}

      {plan.concept.summary.length > 0 ? (
        <Card>
          <VStack gap={8}>
            <Text variant="label" tone="secondary">
              Keep these in mind
            </Text>
            {plan.concept.summary.map((line, i) => (
              <Text
                key={i}
                variant="body-sm"
                language={parentLang}
                tone="secondary"
              >
                • {line}
              </Text>
            ))}
          </VStack>
        </Card>
      ) : null}

      {/**
       * The common mistake is given its own warning-toned card rather than
       * being a bullet. The parent is meant to WATCH for it during the next
       * eight minutes, which makes it an instruction, not a fact.
       */}
      {plan.concept.commonMistake ? (
        <Card tone="warning">
          <HStack gap={10} align="flex-start">
            <AlertTriangle
              size={18}
              color={theme.warning.text}
              style={{ marginTop: 1 }}
            />
            <VStack gap={4} flex={1}>
              <Text variant="label" style={{ color: theme.warning.text }}>
                Watch out for this
              </Text>
              <Text
                variant="body-sm"
                language={parentLang}
                style={{ color: theme.warning.text }}
              >
                {plan.concept.commonMistake}
              </Text>
            </VStack>
          </HStack>
        </Card>
      ) : null}
    </VStack>
  );
}

export function TeachingPhase({ plan }: { plan: StudyPlan }) {
  const theme = useTheme();
  const parentLang = plan.languages.parent.code as LanguageCode;

  if (!plan.teaching.steps?.length) {
    return <LoadingState label="Preparing the walkthrough…" />;
  }

  return (
    <VStack gap={16}>
      <Card>
        <VStack gap={10}>
          <HStack gap={8}>
            <PenLine size={16} color={theme.text.accent} />
            <Text variant="label" tone="accent">
              Work this through together
            </Text>
          </HStack>
          <ReadAloud
            text={plan.teaching.workedExample}
            language={parentLang}
            childId={plan.childId}
            childLanguage={plan.languages.child.code as LanguageCode}
            parentLanguage={parentLang}
          />
        </VStack>
      </Card>

      <Card>
        <VStack gap={12}>
          <Text variant="label" tone="secondary">
            Step by step
          </Text>
          {plan.teaching.steps.map((step, i) => (
            <HStack key={i} gap={10} align="flex-start">
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: radius.full,
                  backgroundColor: theme.brand[600],
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 1,
                }}
              >
                <Text variant="label-sm" style={{ color: "#FFFFFF" }}>
                  {i + 1}
                </Text>
              </View>
              <Text variant="body" language={parentLang} style={{ flex: 1 }}>
                {step}
              </Text>
            </HStack>
          ))}
        </VStack>
      </Card>

      {/**
       * The questions the PARENT asks. Without them this phase becomes a
       * lecture and the child stops listening at minute two — which is exactly
       * what the PRD's "collaborative" framing is guarding against.
       */}
      {plan.teaching.dialoguePrompts?.length ? (
        <Card tone="accent">
          <VStack gap={10}>
            <HStack gap={8}>
              <MessageCircle size={16} color={theme.accents.apricot.color} />
              <Text
                variant="label"
                style={{ color: theme.accents.apricot.color }}
              >
                Ask them
              </Text>
            </HStack>
            {plan.teaching.dialoguePrompts.map((prompt, i) => (
              <Text key={i} variant="body" language={parentLang}>
                “{prompt}”
              </Text>
            ))}
          </VStack>
        </Card>
      ) : null}

      {plan.teaching.checkForUnderstanding ? (
        <Card tone="sunken">
          <VStack gap={4}>
            <Text variant="label-sm" tone="tertiary">
              BEFORE MOVING ON
            </Text>
            <Text variant="body" language={parentLang}>
              {plan.teaching.checkForUnderstanding}
            </Text>
          </VStack>
        </Card>
      ) : null}
    </VStack>
  );
}

export function QuestionPhase({
  plan,
  questions,
  phase,
  answers,
  onAnswered,
}: {
  plan: StudyPlan;
  questions: StudyPlan["practice"];
  phase: "practice" | "mock";
  answers: Record<number, { given: string; verdict: Verdict }>;
  onAnswered: (
    index: number,
    result: { given: string; verdict: Verdict; answerMs: number },
  ) => void;
}) {
  const childLang = plan.languages.child.code as LanguageCode;

  if (!questions?.length) {
    return <LoadingState label="Preparing the questions…" />;
  }

  /**
   * The FIRST unanswered question, one at a time.
   *
   * Showing all of them at once turns a paced 6-minute phase into a worksheet
   * the child scans ahead in — and the pacing timer the PRD asks for stops
   * meaning anything.
   */
  const currentIndex = questions.findIndex((_, i) => !answers[i]);
  const index = currentIndex === -1 ? questions.length - 1 : currentIndex;
  const question = questions[index];

  return (
    <VStack gap={16}>
      <Card>
        <QuestionCard
          key={`${phase}-${index}`}
          question={question}
          index={index}
          total={questions.length}
          language={childLang}
          onAnswered={(r) => onAnswered(index, r)}
        />
      </Card>

      {/* A dot per question, so the child can see how far there is to go. */}
      <HStack gap={6} justify="center">
        {questions.map((_, i) => (
          <QuestionDot
            key={i}
            state={
              answers[i]
                ? answers[i].verdict.correct
                  ? "correct"
                  : "wrong"
                : i === index
                  ? "current"
                  : "todo"
            }
          />
        ))}
      </HStack>
    </VStack>
  );
}

function QuestionDot({
  state,
}: {
  state: "correct" | "wrong" | "current" | "todo";
}) {
  const theme = useTheme();
  const color = {
    correct: theme.success.text,
    wrong: theme.danger.text,
    current: theme.brand[600],
    todo: theme.border.strong,
  }[state];
  return (
    <View
      style={{
        width: state === "current" ? 10 : 8,
        height: state === "current" ? 10 : 8,
        borderRadius: 5,
        backgroundColor: color,
      }}
    />
  );
}

export function RevisionPhase({
  plan,
  revision,
  loading,
  perfect,
}: {
  plan: StudyPlan;
  revision: StudyPlan["revision"];
  loading: boolean;
  perfect: boolean;
}) {
  const theme = useTheme();
  const parentLang = plan.languages.parent.code as LanguageCode;

  if (loading) return <LoadingState label="Working out what to go over…" />;

  /**
   * A perfect score is a CELEBRATION, not invented remediation.
   *
   * The PRD's phase 5 exists to clarify what went wrong; with nothing wrong,
   * manufacturing three minutes of revision would waste the family's evening
   * and teach the child that doing well earns more work.
   */
  if (perfect || !revision?.clarifications?.length) {
    return (
      <Card tone="success">
        <VStack gap={10} align="center" style={{ paddingVertical: 16 }}>
          <Sparkles size={28} color={theme.success.text} />
          <Text
            variant="h2"
            align="center"
            style={{ color: theme.success.text }}
          >
            Nothing to go back over
          </Text>
          <Text
            variant="body"
            align="center"
            language={parentLang}
            style={{ color: theme.success.text }}
          >
            {revision?.encouragement || "Every answer was right tonight."}
          </Text>
        </VStack>
      </Card>
    );
  }

  return (
    <VStack gap={16}>
      <Card tone="sunken">
        <VStack gap={6}>
          <Text variant="label-sm" tone="tertiary">
            WHAT TO GO OVER
          </Text>
          <Text variant="body-lg" language={parentLang}>
            {revision.focus}
          </Text>
        </VStack>
      </Card>

      {revision.clarifications.map((c, i) => (
        <Card key={i}>
          <VStack gap={10}>
            <Text
              variant="label"
              tone="secondary"
              language={plan.languages.child.code as LanguageCode}
            >
              {c.questionPrompt}
            </Text>
            {c.whyWrong ? (
              <View
                style={{
                  padding: 10,
                  borderRadius: radius.sm,
                  backgroundColor: theme.warning.bg,
                }}
              >
                <Text
                  variant="body-sm"
                  language={parentLang}
                  style={{ color: theme.warning.text }}
                >
                  {c.whyWrong}
                </Text>
              </View>
            ) : null}
            <DualScript
              parentLanguage={parentLang}
              childLanguage={plan.languages.child.code as LanguageCode}
              parentLabel="EXPLAIN IT LIKE THIS"
              parentOnly
              parentContent={
                <ReadAloud text={c.reteach} language={parentLang} size="body" />
              }
            />
          </VStack>
        </Card>
      ))}

      {revision.encouragement ? (
        <Card tone="accent">
          <VStack gap={4}>
            <Text
              variant="label-sm"
              style={{ color: theme.accents.apricot.color }}
            >
              END WITH THIS
            </Text>
            <Text variant="body-lg" language={parentLang}>
              {revision.encouragement}
            </Text>
          </VStack>
        </Card>
      ) : null}
    </VStack>
  );
}
