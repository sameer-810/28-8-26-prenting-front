import React, { useEffect, useMemo, useState } from "react";
import { Image, Platform, Pressable, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import {
  Keyboard,
  Camera,
  ChevronRight,
  Sparkles,
  Image as ImageIcon,
  X,
} from "lucide-react-native";
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
import { useImageCapture } from "@shared/useImageCapture";
import { referenceApi } from "@shared/api/referenceApi";
import { useChildren } from "@modules/auth/hooks/useAuth";
import { planApi } from "@modules/session/api/sessionApi";
import { materialApi } from "../api/materialApi";

/**
 * Zero-prompt capture — PRD §4.1.
 *
 * The parent says what they need in their own words. "My child has a maths test
 * on fractions tomorrow" is the input; no prompt engineering, no taxonomy to
 * navigate. If the topic is ambiguous the API refuses rather than guessing, and
 * this screen turns that refusal into a one-tap choice.
 */

/**
 * Subjects come from the API, per board and grade.
 *
 * A hardcoded list here offered Hindi to every child and Science from Grade 3,
 * and the curriculum has neither — Grades 1-2 carry Maths alone, Grades 3-5
 * carry EVS. Picking one of the phantom subjects filtered the topic search down
 * to nothing, and the generator fell through to an off-syllabus session. The
 * picker can only offer what can actually be taught.
 */

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
  const {
    capture: pickImages,
    busy: capturing,
    permissionDenied: cameraDenied,
    inputRef: fileInputRef,
    onWebFiles,
  } = useImageCapture();
  const isWeb = Platform.OS === "web";

  const { data: children } = useChildren();
  const [childId, setChildId] = useState(route.params?.childId ?? "");
  const [intent, setIntent] = useState("");
  const [subject, setSubject] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  /** Ranked alternatives the API returned when it refused to guess. */
  const [suggestions, setSuggestions] = useState<
    { id: string; topic: string; chapter: string; score: number }[]
  >([]);
  /**
   * Whether the API asked us to confirm the topic at all.
   *
   * Kept separately from `suggestions` because the API also declines when it
   * has NOTHING to offer — the words matched no topic in this child's syllabus.
   * Gating the card on `suggestions.length` alone made that case render nothing,
   * leaving the parent on a screen that had silently refused them.
   */
  const [asked, setAsked] = useState<{
    offSyllabus: boolean;
    interpreted?: string;
  } | null>(null);

  const clearAsk = () => {
    setSuggestions([]);
    setAsked(null);
  };

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
          offSyllabus?: boolean;
          interpreted?: string;
        }>(err);
        // The API caps candidates at five (curriculum.matching.js rankTopics).
        // Capped again here so the overlay can never outgrow a phone screen if
        // that ever changes server-side.
        setSuggestions((details?.suggestions ?? []).slice(0, 5));
        setAsked({
          offSyllabus: Boolean(details?.offSyllabus),
          interpreted: details?.interpreted,
        });
        setError(null);
        return;
      }
      clearAsk();
      setError(apiErrorMessage(err, "We couldn't build a session"));
    },
  });

  /**
   * Photographed pages, uploaded and ready to ground the session.
   *
   * Held here rather than inside the capture card because they are an INPUT to
   * generation: a plan built from a page the parent shot is grounded in that
   * page, which is stronger evidence than anything they could have typed.
   */
  const [pages, setPages] = useState<
    { id: string; uri: string; topics?: string[]; subject?: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);

  const addPages = async (source: "camera" | "library") => {
    if (!child) return;
    setError(null);
    const images = await pickImages(source);
    if (!images.length) return;
    if (pages.length + images.length > 6) {
      setError("Six pages is the most one session can be built from.");
      return;
    }

    setUploading(true);
    try {
      const material = await materialApi.capture({
        images,
        childId: child.id,
        kind: "textbook_page",
      });
      setPages((prev) => [
        ...prev,
        ...images.map((img, i) => ({
          // One material can carry several images; the id repeats and is
          // de-duplicated before it is sent to the generator.
          id: material.id,
          uri: img.uri,
          topics: i === 0 ? material.topics : undefined,
          subject: i === 0 ? material.subject : undefined,
        })),
      ]);
      clearAsk();
    } catch (err) {
      setError(apiErrorMessage(err, "That page couldn't be read. Try again."));
    } finally {
      setUploading(false);
    }
  };

  const removePage = (uri: string) => {
    setPages((prev) => prev.filter((p) => p.uri !== uri));
  };

  /**
   * The subjects this child's board and grade actually have topics for.
   *
   * Re-fetched when the child changes, because a Grade 2 sibling and a Grade 6
   * sibling do not share a syllabus. A failed fetch leaves the list empty and
   * the picker hides itself — narrowing by subject is optional, and offering a
   * broken control is worse than offering none.
   */
  const [subjects, setSubjects] = useState<{ value: string; label: string }[]>(
    [],
  );

  useEffect(() => {
    if (!child) return;
    let cancelled = false;
    referenceApi
      .subjects(child.board, child.grade)
      .then((list) => {
        if (cancelled) return;
        const next = list.map((s) => ({ value: s.code, label: s.label }));
        setSubjects(next);
        // Drop a selection the new child's syllabus does not carry — a Grade 6
        // sibling has Science, a Grade 2 one does not.
        setSubject((cur) =>
          cur && next.some((s) => s.value === cur) ? cur : undefined,
        );
      })
      .catch(() => {
        if (!cancelled) setSubjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [child?.id, child?.board, child?.grade]);

  const submit = (overrides?: { topicId?: string; force?: boolean }) => {
    if (!child) return;
    setError(null);
    const materialIds = [...new Set(pages.map((p) => p.id))];
    generate.mutate({
      childId: child.id,
      intentText: intent.trim() || undefined,
      subject,
      materialIds: materialIds.length ? materialIds : undefined,
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
                if (asked) clearAsk();
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
        {asked ? (
          <Card tone="info">
            <VStack gap={12}>
              <VStack gap={2}>
                <Text variant="label" style={{ color: theme.info.text }}>
                  {asked.offSyllabus
                    ? "That isn't in this year's syllabus"
                    : "Which one did you mean?"}
                </Text>
                <Text variant="caption" style={{ color: theme.info.text }}>
                  {asked.offSyllabus
                    ? `We couldn't match "${asked.interpreted ?? intent}" to a Grade ${child?.grade ?? ""} topic. You can still study it — it just won't count toward syllabus coverage.`
                    : "We'd rather ask than build the wrong session."}
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
                  <ChevronRight size={16} color={theme.text.tertiary} />
                </Pressable>
              ))}
              <Button
                label={
                  asked.offSyllabus
                    ? "Study it anyway"
                    : "None of these — use what I typed"
                }
                variant="secondary"
                size="sm"
                onPress={() => submit({ force: true })}
              />
            </VStack>
          </Card>
        ) : null}

        {subjects.length ? (
          <VStack gap={10}>
            <Text variant="label-sm" tone="tertiary">
              OR NARROW IT DOWN
            </Text>
            <Select
              label="Subject"
              value={subject}
              options={subjects}
              placeholder="Any subject"
              onChange={setSubject}
              hint={`Optional — these are the subjects on ${child?.name ?? "your child"}'s Grade ${child?.grade ?? ""} syllabus.`}
            />
          </VStack>
        ) : null}

        {/**
         * Photographing the page. The strongest way in: a parent who cannot
         * name the topic can always point a camera at it, and a plan grounded
         * in the actual page beats one grounded in a guess about it.
         */}
        <Card tone={pages.length ? "default" : "sunken"}>
          <VStack gap={12}>
            <HStack gap={12}>
              <Camera size={18} color={theme.text.accent} />
              <VStack gap={2} flex={1}>
                <Text variant="label" tone="secondary">
                  Photograph the page
                </Text>
                <Text variant="caption" tone="tertiary">
                  {pages.length
                    ? `${pages.length} page${pages.length === 1 ? "" : "s"} attached — tonight's session will be built from ${pages.length === 1 ? "it" : "them"}.`
                    : "Point the camera at the textbook page or worksheet. Up to six."}
                </Text>
              </VStack>
            </HStack>

            {cameraDenied ? (
              <Banner
                tone="warning"
                title="Camera permission is off"
                body="Allow camera access for ParentAI in your phone's settings, then try again. You can also pick a photo you've already taken."
              />
            ) : null}

            {pages.length ? (
              <HStack gap={8} wrap>
                {pages.map((p) => (
                  <View key={p.uri} style={{ position: "relative" }}>
                    <Image
                      source={{ uri: p.uri }}
                      style={{
                        width: 72,
                        height: 96,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: theme.border.default,
                      }}
                      // The page is the parent's own photo; describing it beyond
                      // what it is would be inventing content.
                      accessibilityLabel="Attached page"
                    />
                    <Pressable
                      onPress={() => removePage(p.uri)}
                      accessibilityRole="button"
                      accessibilityLabel="Remove this page"
                      style={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        width: 28,
                        height: 28,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: radius.full,
                        backgroundColor: theme.surface.primary,
                        borderWidth: 1,
                        borderColor: theme.border.default,
                      }}
                    >
                      <X size={14} color={theme.text.secondary} />
                    </Pressable>
                  </View>
                ))}
              </HStack>
            ) : null}

            {pages[0]?.topics?.length ? (
              <Text variant="caption" tone="tertiary">
                Read from the page: {pages[0].topics.slice(0, 3).join(", ")}
              </Text>
            ) : null}

            {isWeb ? (
              /**
               * Web has no reliable in-page still capture across browsers, so
               * the OS picker does the work — `capture="environment"` opens a
               * phone browser straight into the rear camera.
               */
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                style={{ display: "none" }}
                onChange={onWebFiles}
              />
            ) : null}

            <HStack gap={8} wrap>
              <Button
                label={pages.length ? "Add another page" : "Take a photo"}
                icon={<Camera size={15} color="#FFFFFF" />}
                size="sm"
                onPress={() => void addPages("camera")}
                loading={uploading || capturing}
                disabled={!isOnline || pages.length >= 6}
              />
              {!isWeb ? (
                <Button
                  label="Choose a photo"
                  variant="secondary"
                  size="sm"
                  icon={<ImageIcon size={15} color={theme.text.accent} />}
                  onPress={() => void addPages("library")}
                  disabled={!isOnline || pages.length >= 6}
                />
              ) : null}
            </HStack>
          </VStack>
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
