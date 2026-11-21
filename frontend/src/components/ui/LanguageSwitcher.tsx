"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils/cn";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "id", label: "ID" },
] as const;

// Renders a compact segmented toggle between English and Indonesian.
export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Bahasa"
      className={cn("inline-flex h-8 items-center rounded-lg bg-muted p-0.5 text-xs font-medium", className)}
    >
      {LANGUAGES.map((option) => (
        <button
          key={option.code}
          type="button"
          aria-pressed={lang === option.code}
          onClick={() => setLang(option.code)}
          className={cn(
            "inline-flex h-full min-w-9 cursor-pointer items-center justify-center rounded-md px-2.5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            lang === option.code ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
