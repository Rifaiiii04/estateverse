"use client";

import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils/cn";
import { FormField, fieldIdFrom } from "@/components/ui/FormField";
import { inputClassName } from "@/components/ui/Input";
import { toSubscriberDigits } from "@/lib/utils/whatsapp";

interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type" | "maxLength"> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Digits after +62, e.g. "82289659204". */
  value: string;
  onValueChange: (subscriberDigits: string) => void;
}

// PhoneInput is an Indonesian phone field with a fixed +62 prefix; a typed or pasted 0 / +62 is removed automatically.
export function PhoneInput({ label, error, helperText, className, id, value, onValueChange, ...props }: PhoneInputProps) {
  const inputId = fieldIdFrom(id, label) || "phone";
  const prefixId = `${inputId}-prefix`;
  const describedBy = [prefixId, error ? `${inputId}-error` : ""].filter(Boolean).join(" ");

  return (
    <FormField id={inputId} label={label} error={error} helperText={helperText}>
      <div className="relative">
        <span
          id={prefixId}
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center border-r border-input pl-2.5 pr-2 my-1.5 text-base font-semibold text-neutral-700 md:text-sm"
        >
          +62
        </span>
        <InputPrimitive
          id={inputId}
          type="tel"
          inputMode="numeric"
          data-slot="input"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          value={value}
          onChange={(e) => onValueChange(toSubscriberDigits(e.target.value))}
          className={cn(inputClassName, "pl-14", className)}
          {...props}
        />
      </div>
    </FormField>
  );
}
