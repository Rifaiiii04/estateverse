"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { en } from "@/lib/i18n/en";
import { id } from "@/lib/i18n/id";

export type Language = "en" | "id";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof en;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: en,
});

// LanguageProvider manages bilingual preferences and provides SEO-friendly English/Indonesian translations.
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("estateverse_lang") as Language;
    if (saved === "en" || saved === "id") {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("estateverse_lang", newLang);
  };

  const t = lang === "id" ? id : en;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// useLanguage custom hook accesses the active language and dictionary.
export function useLanguage() {
  return useContext(LanguageContext);
}
