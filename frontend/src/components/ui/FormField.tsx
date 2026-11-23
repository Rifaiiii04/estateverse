import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Label } from "@/components/ui/Label";

interface FormFieldProps {
  id?: string;
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
  children: React.ReactNode;
}

// Derives a stable field id from an explicit id or the label text.
export function fieldIdFrom(id: string | undefined, label: string | undefined) {
  return id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
}

// Wraps a form control with its label, validation error, and helper text.
export function FormField({ id, label, error, helperText, className, children }: FormFieldProps) {
  return (
    <div data-slot="field" className={cn("group/field flex w-full flex-col gap-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      {children}
      {error && (
        <p id={id ? `${id}-error` : undefined} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {helperText && !error && <p className="text-sm text-muted-foreground">{helperText}</p>}
    </div>
  );
}
