import React, { useMemo, useState } from "react";
import { Pressable } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import { Keyboard, Camera, ChevronRight, Sparkles } from "lucide-react-native";
import { apiErrorCode, apiErrorDetails, apiErrorMessage } from "@api/apiClient";
import { radius } from "@shared/designSystem";
import { useTheme } from "@shared/useTheme";
import { useOfflineStore } from "@shared/offline/useOfflineStore";
import { useAppNavigation, type AppStackParamList } from "@navigation/types";
import {
  Screen,
  Text,
  Button,
  Card,
  TextField,
  Select,
  VStack,
  HStack,
  Banner,
  Chip,
  LoadingState,
} from "@shared/ui";
import { useChildren } from "@modules/auth/hooks/useAuth";
import { planApi } from "@modules/session/api/sessionApi";

/**
 * Zero-prompt capture — PRD §4.1.
 *
 * The parent says what they need in their own words. "My child has a maths test
 * on fractions tomorrow" is the input; no prompt engineering, no taxonomy to
 * navigate. If the topic is ambiguous the API refuses rather than guessing, and
 * this screen turns that refusal into a one-tap choice.
 */

const SUBJECTS = [
  { value: "maths", label: "Maths" },
  { value: "science", label: "Science" },
  { value: "evs", label: "Environmental Studies" },
  { value: "english", label: "English" },
  { value: "social_studies", label: "Social Studies" },
  { value: "hindi", label: "Hindi" },
];

/** What a tired parent at 8pm most often means, one tap away. */
const QUICK_INTENTS = [
  "Test tomorrow",
  "Homework tonight",
  "Revision",
  "They're stuck on something",
];

export default function CaptureScreen() {
  const route = useRoute<RouteProp<AppStackParamList, "Capture">>();
  const navigation = useAppNavigation();
  const theme = useTheme();
  const isOnline = useOfflineStore((s) => s.isOnline);

  const { data: children } = useChildren();
  const [childId, setChildId] = useState(route.params?.childId ?? "");
  const [intent, setIntent] = useState("");
  const [subject, setSubject] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  /** Ranked alternatives the API returned when it refused to guess. */
  const [suggestions, setSuggestions] = useState<
    { id: string; topic: string; chapter: string; score: number }[]
  >([]);

  const child = useMemo(
    () => children?.find((c) => c.id === childId) ?? children?.[0],
    [children, childId],
  );

  const generate = useMutation({
    mutationFn: planApi.generate,
    onSuccess: (plan) => navigation.navigate("Plan", { planId: plan.id }),
    onError: (err) => {
      /**
       * `TOPIC_AMBIGUOUS` is not a failure — it is the API declining to guess
       * between five fraction topics, and it comes with the ranked candidates.
       * Rendering them as choices turns the one case that would most damage
       * trust into a single tap.
       */
      if (apiErrorCode(err) === "TOPIC_AMBIGUOUS") {
        const details = apiErrorDetails<{
          suggestions: {
            id: string;
            topic: string;
            chapter: string;
            score: number;
          }[];
        }>(err);
        setSuggestions(details?.suggestions ?? []);
        setError(null);
        return;
      }
      setSuggestions([]);
      setError(apiErrorMessage(err, "We couldn't build a session"));
    },
  });

  const submit = (overrides?: { topicId?: string; force?: boolean }) => {
    if (!child) return;
    setError(null);
    generate.mutate({
      childId: child.id,
      intentText: intent.trim() || undefined,
      subject,
      ...overrides,
    });
  };

  if (!children) return <LoadingState label="Loading…" />;

  const quotaExceeded = apiErrorCode(generate.error) === "QUOTA_EXCEEDED";

  return (
    <Screen
      title="What are we studying?"
      subtitle={child ? `For ${child.name}, Grade ${child.grade}` : undefined}
    >
      <VStack gap={18} style={{ maxWidth: 560 }}>
        {!isOnline ? (
          <Banner
            tone="warning"
            title="You're offline"
            body="Building a new session needs a connection. Any session you've already started still works."
          />
        ) : null}

        {error ? (
          <Banner
            tone={quotaExceeded ? "warning" : "danger"}
            title={
              quotaExceeded
                ? "That's today's sessions used"
                : "Couldn't build a session"
            }
            body={error}
            onDismiss={() => setError(null)}
          />
        ) : null}

        {children.length > 1 ? (
          <Select
            label="Who's studying?"
            value={child?.id}
            options={children.map((c) => ({
              value: c.id,
              label: c.name,
              hint: `Grade ${c.grade}`,
            }))}
            onChange={setChildId}
          />
        ) : null}

        <Card>
          <VStack gap={14}>
            <HStack gap={8}>
              <Keyboard size={16} color={theme.text.accent} />
              <Text variant="label" tone="accent">
                Just say it in your own words
              </Text>
            </HStack>

            <TextField
              value={intent}
              onChangeText={(t) => {
                setIntent(t);
                if (suggestions.length) setSuggestions([]);
              }}
              placeholder="Maths test tomorrow on adding fractions"
              multilineRows={3}
              accessibilityLabel="What are we studying"
              hint="Hindi, Marathi or a mix of both is fine — we'll work it out."
            />

            <HStack gap={8} wrap>
              {QUICK_INTENTS.map((q) => (
                <Chip
                  key={q}
                  label={q}
                  onPress={() =>
                    setIntent((prev) => (prev ? `${prev} — ${q}` : q))
                  }
                />
              ))}
            </HStack>
          </VStack>
        </Card>

        {/**
         * The ambiguity resolution. Presented as "did you mean" rather than as
         * an error, because the parent did nothing wrong — "fractions" is a
         * perfectly reasonable thing to say, it just names five topics.
         */}
        {suggestions.length > 0 ? (
          <Card tone="info">
            <VStack gap={12}>
              <VStack gap={2}>
                <Text variant="label" style={{ color: theme.info.text }}>
                  Which one did you mean?
                </Text>
                <Text variant="caption" style={{ color: theme.info.text }}>
                  We'd rather ask than build the wrong session.
                </Text>
              </VStack>
              {suggestions.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => submit({ topicId: s.id, force: true })}
                  accessibilityRole="button"
                  accessibilityLabel={s.topic}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 12,
                    borderRadius: radius.md,
                    backgroundColor: theme.surface.primary,
                    borderWidth: 1,
                    borderColor: theme.border.default,
                  }}
                >
                  <VStack gap={2} flex={1}>
                    <Text variant="body">{s.topic}</Text>
                    {s.chapter ? (
                      <Text variant="caption" tone="tertiary">
                        {s.chapter}
                      </Text>
                    ) : null}
                  </VStack>
                  <ChevronRight size={16} color={theme.text.disabled} />
                </Pressable>
              ))}
              <Button
                label="None of these — use what I typed"
                variant="secondary"
                size="sm"
                onPress={() => submit({ force: true })}
              />
            </VStack>
          </Card>
        ) : null}

        <VStack gap={10}>
          <Text variant="label-sm" tone="tertiary">
            OR NARROW IT DOWN
          </Text>
          <Select
            label="Subject"
            value={subject}
            options={SUBJECTS}
            placeholder="Any subject"
            onChange={setSubject}
            hint="Optional — it helps us find the right topic faster."
          />
        </VStack>

        {/**
         * Camera capture is a named, honest placeholder rather than a hidden
         * feature: the backend endpoint exists and works, but the native camera
         * flow needs device testing this build has not had.
         */}
        <Card tone="sunken">
          <HStack gap={12}>
            <Camera size={18} color={theme.text.tertiary} />
            <VStack gap={2} flex={1}>
              <Text variant="label" tone="secondary">
                Photograph the page
              </Text>
              <Text variant="caption" tone="tertiary">
                Scanning a textbook page or worksheet arrives in the next build.
              </Text>
            </VStack>
          </HStack>
        </Card>

        <Button
          label="Build tonight's session"
          icon={<Sparkles size={16} color="#FFFFFF" />}
          onPress={() => submit()}
          loading={generate.isPending}
          disabled={!isOnline || !intent.trim() || !child}
          size="lg"
        />
        <Text variant="caption" tone="tertiary" align="center">
          Takes about five seconds.
        </Text>
      </VStack>
    </Screen>
  );
}
