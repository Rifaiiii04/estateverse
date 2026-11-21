"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/cn";
import { FormField } from "@/components/ui/FormField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

type SelectVariant = "field" | "pill" | "compact" | "minimal";

interface CustomSelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  variant?: SelectVariant;
  align?: "left" | "right";
}

// Trigger styling for each select placement: form field, filter pill, compact toolbar, or inline text.
const triggerVariantClass: Record<SelectVariant, string> = {
  field: "w-full",
  pill: "rounded-full bg-background px-3.5 font-medium",
  compact: "bg-background font-medium",
  minimal: "border-transparent font-semibold hover:bg-muted",
};

// Renders a dropdown select built on the shared Select primitives from an options array.
export function CustomSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Pilih opsi...",
  disabled = false,
  className = "",
  variant = "field",
  align = "left",
}: CustomSelectProps) {
  const triggerId = useId();
  const items = Object.fromEntries(options.map((option) => [option.value, option.label]));
  const isField = variant === "field";

  const select = (
    <Select items={items} value={value || null} onValueChange={(next) => next !== null && onChange(next)} disabled={disabled}>
      <SelectTrigger
        id={triggerId}
        size={variant === "compact" || variant === "minimal" ? "sm" : "default"}
        className={cn(triggerVariantClass[variant], !label && className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align={align === "right" ? "end" : "start"} alignItemWithTrigger={isField}>
        {options.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">Tidak ada pilihan</p>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex flex-col">
              <span>{option.label}</span>
              {option.description && <span className="text-xs text-muted-foreground">{option.description}</span>}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (!label) return select;

  return (
    <FormField id={triggerId} label={label} className={className}>
      {select}
    </FormField>
  );
}
