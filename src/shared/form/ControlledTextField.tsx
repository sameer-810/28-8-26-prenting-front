import React, { ComponentProps } from "react";
import { useController, Control, FieldValues, FieldPath } from "react-hook-form";
import { TextField } from "@shared/ui";

/**
 * A `TextField` bound to react-hook-form.
 *
 * THE RN-IDIOMATIC WAY, not a convenience. React Native's `TextInput` has no
 * DOM ref, so react-hook-form's web `register()` path does not apply at all —
 * the official answer is a controlled input driven by `useController`, wrapped
 * once so every form gets value/onBlur/error wiring for free.
 *
 * Before this existed the wiring was written out 27 times across 8 screens, six
 * to eight lines each. Every one of those is a chance to forget `onBlur` (so
 * validation never fires on leaving the field) or to pass the wrong
 * `errors.x?.message` after a field is renamed — a mistake nothing catches,
 * because a missing error message renders as no error.
 */
type TextFieldProps = ComponentProps<typeof TextField>;

interface Props<T extends FieldValues>
  extends Omit<TextFieldProps, "value" | "onChangeText" | "onBlur" | "error"> {
  control: Control<T>;
  name: FieldPath<T>;
}

export function ControlledTextField<T extends FieldValues>({
  control,
  name,
  ...textFieldProps
}: Props<T>) {
  const { field, fieldState } = useController({ control, name });

  return (
    <TextField
      {...textFieldProps}
      /**
       * Coerced to a string, and `null`/`undefined` to "".
       *
       * A controlled `TextInput` handed `undefined` becomes UNCONTROLLED, and
       * React then warns and stops updating it — the field silently ignores
       * `reset()` and keeps whatever was typed. It is a real trap on any form
       * with an optional field.
       */
      value={field.value == null ? "" : String(field.value)}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
    />
  );
}
