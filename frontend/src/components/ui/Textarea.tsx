import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { FormField, fieldIdFrom } from "@/components/ui/FormField";

// Shared classes for multiline text controls.
export const textareaClassName =
  "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm";

interface TextareaProps extends React.ComponentProps<"textarea"> {
  label?: string;
  error?: string;
  helperText?: string;
}

// Renders a multiline input, wrapped with label and validation feedback when those props are given.
export function Textarea({ label, error, helperText, className, id, rows = 4, ...props }: TextareaProps) {
  const textareaId = fieldIdFrom(id, label);
  const control = (
    <textarea
      id={textareaId}
      rows={rows}
      data-slot="textarea"
      aria-invalid={error ? true : undefined}
      aria-describedby={error && textareaId ? `${textareaId}-error` : undefined}
      className={cn(textareaClassName, className)}
      {...props}
    />
  );

  if (!label && !error && !helperText) return control;

  return (
    <FormField id={textareaId} label={label} error={error} helperText={helperText}>
      {control}
    </FormField>
  );
}
