import React, { ComponentProps } from "react";
import { useController, Control, FieldValues, FieldPath } from "react-hook-form";
import { Select } from "@shared/ui";

/**
 * A `Select` bound to react-hook-form. The counterpart to
 * `ControlledTextField`, and for the same reason — see the note there.
 */
type SelectProps = ComponentProps<typeof Select>;

interface Props<T extends FieldValues>
  extends Omit<SelectProps, "value" | "onChange" | "error"> {
  control: Control<T>;
  name: FieldPath<T>;
}

export function ControlledSelect<T extends FieldValues>({
  control,
  name,
  ...selectProps
}: Props<T>) {
  const { field, fieldState } = useController({ control, name });

  return (
    <Select
      {...selectProps}
      value={field.value == null ? undefined : String(field.value)}
      onChange={field.onChange}
      error={fieldState.error?.message}
    />
  );
}
