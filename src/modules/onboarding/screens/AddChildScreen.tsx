import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ControlledTextField, ControlledSelect } from "@shared/form";
import { apiErrorMessage, apiErrorCode } from "@api/apiClient";
import { useAppNavigation, goToTab } from "@navigation/types";
import { useAuthStore } from "@shared/store/useAuthStore";
import { useFontStore, type LanguageCode } from "@shared/fonts";
import {
  Screen,
  Text,
  Button,
  Select,
  VStack,
  Banner,
  Card,
  LoadingState,
} from "@shared/ui";
import { useReference, useCreateChild, useChildren } from "@modules/auth/hooks/useAuth";
import { childSchema, type ChildInput } from "@modules/auth/auth.validation";

/**
 * Adding a child — the first thing after signup, and the highest-drop-off
 * screen in any family product.
 *
 * So it asks for as little as possible: a name and a grade are genuinely
 * enough. Board, medium and language are pre-filled from the household and can
 * be corrected here or later; the server infers the subject list. Everything
 * beyond the first two fields is presented as adjustable, not as required.
 */
export default function AddChildScreen() {
  const navigation = useAppNavigation();
  const family = useAuthStore((s) => s.family);
  const ensureFont = useFontStore((s) => s.ensure);
  const { data: reference, isLoading } = useReference();
  const { data: existing } = useChildren();
  const createChild = useCreateChild();
  const [formError, setFormError] = useState<string | null>(null);

  const isFirstChild = !existing || existing.length === 0;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ChildInput>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      name: "",
      grade: 5,
      board: "cbse",
      schoolMedium: "en",
      homeLanguage: (family?.homeLanguage as string) || "en",
      schoolName: "",
    },
  });

  const board = watch("board");
  const homeLanguage = watch("homeLanguage") as LanguageCode;

  const boardOptions = useMemo(
    () =>
      (reference?.boards || []).map((b) => ({
        value: b.code,
        label: b.name,
        hint: b.state || b.fullName,
      })),
    [reference],
  );

  const languageOptions = useMemo(
    () =>
      (reference?.languages || []).map((l) => ({
        value: l.code,
        // The endonym leads: a Marathi-speaking parent scans for "मराठी", not
        // for the English word "Marathi".
        label: l.code === "en" ? "English" : `${l.endonym} · ${l.name}`,
      })),
    [reference],
  );

  const gradeOptions = useMemo(
    () => (reference?.grades || []).map((g) => ({ value: String(g.value), label: g.label })),
    [reference],
  );

  const onSubmit = (values: ChildInput) => {
    setFormError(null);
    createChild.mutate(
      { ...values, grade: Number(values.grade) },
      {
        onSuccess: () => goToTab(navigation),
        onError: (err) => {
          const code = apiErrorCode(err);
          setFormError(
            code === "PLAN_LIMIT"
              ? apiErrorMessage(err)
              : apiErrorMessage(err, "We couldn't add that profile"),
          );
        },
      },
    );
  };

  if (isLoading) return <LoadingState label="Getting things ready…" />;

  return (
    <Screen
      title={isFirstChild ? "Who are we helping?" : "Add another child"}
      subtitle={
        isFirstChild
          ? "Two details is enough to start. You can change anything later."
          : undefined
      }
    >
      <VStack gap={18} style={{ maxWidth: 520 }}>
        {formError ? (
          <Banner
            tone={apiErrorCode(createChild.error) === "PLAN_LIMIT" ? "warning" : "danger"}
            title={
              apiErrorCode(createChild.error) === "PLAN_LIMIT"
                ? "Your plan is full"
                : "Couldn't add that profile"
            }
            body={formError}
            onDismiss={() => setFormError(null)}
          />
        ) : null}

        <Card>
          <VStack gap={16}>
            <ControlledTextField
              control={control}
              name="name"
              label="Child's name"
              placeholder="Aarav"
              hint="A nickname is fine — it's just what we'll call them."
              required
            />

            {/**
              * The three fields below stay on the raw <Controller>, and not by
              * oversight. ControlledSelect passes `field.onChange` straight
              * through, which is right for a field that only stores what was
              * picked — and wrong for these:
              *
              *   grade         needs Number(v); a Select yields strings, and the
              *                 schema wants a number
              *   board         re-suggests the school medium when it changes
              *   homeLanguage  starts the font download for that script
              *
              * A wrapper that grew options for all of that would be harder to
              * read than the thing it replaced.
              */}
            <Controller
              control={control}
              name="grade"
              render={({ field: { onChange, value } }) => (
                <Select
                  label="Grade"
                  value={String(value)}
                  options={gradeOptions}
                  onChange={(v) => onChange(Number(v))}
                  error={errors.grade?.message}
                  required
                />
              )}
            />
          </VStack>
        </Card>

        <VStack gap={4}>
          <Text variant="label" tone="secondary">
            School and language
          </Text>
          <Text variant="caption" tone="tertiary">
            We've guessed these. Change them if we got it wrong.
          </Text>
        </VStack>

        <Card>
          <VStack gap={16}>
            <Controller
              control={control}
              name="board"
              render={({ field: { onChange, value } }) => (
                <Select
                  label="Board"
                  value={value}
                  options={boardOptions}
                  onChange={(v) => {
                    onChange(v);
                    /**
                     * Changing the board re-suggests its default medium. A
                     * parent picking "UP Board" almost certainly means Hindi
                     * medium, and making them set it separately is a question
                     * we already know the answer to.
                     */
                    const picked = reference?.boards.find((b) => b.code === v);
                    if (picked) setValue("schoolMedium", picked.defaultMedium);
                  }}
                  error={errors.board?.message}
                />
              )}
            />

            <ControlledSelect
              control={control}
              name="schoolMedium"
              label="School teaches in"
              options={languageOptions}
              hint="Your child's questions and exams will be in this language."
            />

            <Controller
              control={control}
              name="homeLanguage"
              render={({ field: { onChange, value } }) => (
                <Select
                  label="You'll teach in"
                  value={value}
                  options={languageOptions}
                  onChange={(v) => {
                    onChange(v);
                    // Start the font download now: the script will be needed a
                    // minute from now, and fetching it here means it is already
                    // in the right face when the first session appears.
                    void ensureFont(v as LanguageCode);
                  }}
                  hint="Your teaching script will be written in this language."
                  error={errors.homeLanguage?.message}
                />
              )}
            />

            <ControlledTextField
              control={control}
              name="schoolName"
              label="School (optional)"
              placeholder="Vidya Mandir"
            />
          </VStack>
        </Card>

        {/**
         * The dual-language explanation appears only when the two differ —
         * which is exactly the PRD's second persona, and the case the whole
         * dual display exists for. Showing it to an English/English family
         * would be noise about a feature they will never see.
         */}
        {board && homeLanguage !== watch("schoolMedium") ? (
          <Banner
            tone="info"
            title="You'll each see your own language"
            body="Your teaching notes come in your language; your child's questions come in their school's. Side by side, on the same screen."
          />
        ) : null}

        <View style={{ height: 4 }} />
        <Button
          label={isFirstChild ? "Start learning" : "Add child"}
          onPress={handleSubmit(onSubmit)}
          loading={createChild.isPending}
          size="lg"
        />
      </VStack>
    </Screen>
  );
}
