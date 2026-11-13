"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

// LanguageSwitcher renders an ultra-clean minimalist bilingual toggle for English and Indonesian.
export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="inline-flex items-center h-9 rounded-xl bg-neutral-100 p-1 text-xs font-semibold border border-neutral-200/80">
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`h-full px-2.5 rounded-lg transition-all cursor-pointer inline-flex items-center ${
          lang === "en"
            ? "bg-sage-600 text-white shadow-2xs"
            : "text-neutral-500 hover:text-neutral-900"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("id")}
        className={`h-full px-2.5 rounded-lg transition-all cursor-pointer inline-flex items-center ${
          lang === "id"
            ? "bg-sage-600 text-white shadow-2xs"
            : "text-neutral-500 hover:text-neutral-900"
        }`}
      >
        ID
      </button>
    </div>
  );
}
