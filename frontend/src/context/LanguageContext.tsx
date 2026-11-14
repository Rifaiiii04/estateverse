"use client";

import React, { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import { en } from "@/lib/i18n/en";
import { id } from "@/lib/i18n/id";

export type Language = "en" | "id";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof en;
}

const LANG_KEY = "estateverse_lang";
const LANG_EVENT = "estateverse-lang-change";

const LanguageContext = createContext<LanguageContextType>({
  lang: "id",
  setLang: () => {},
  t: id,
});

// subscribeLanguage notifies React when the saved language changes in this or another tab.
function subscribeLanguage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LANG_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LANG_EVENT, onChange);
  };
}

// readSavedLanguage returns the visitor's saved language, defaulting to Indonesian.
function readSavedLanguage(): Language {
  return localStorage.getItem(LANG_KEY) === "en" ? "en" : "id";
}

// serverLanguage is the language used for server rendering before the saved preference is known.
function serverLanguage(): Language {
  return "id";
}

// LanguageProvider manages bilingual preferences, defaulting to Indonesian for the primary audience.
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribeLanguage, readSavedLanguage, serverLanguage);

  // Keeps the document language attribute in sync for screen readers.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Persists and applies a new interface language.
  const setLang = useCallback((newLang: Language) => {
    localStorage.setItem(LANG_KEY, newLang);
    window.dispatchEvent(new Event(LANG_EVENT));
  }, []);

  const t = lang === "id" ? id : en;

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

// useLanguage custom hook accesses the active language and dictionary.
export function useLanguage() {
  return useContext(LanguageContext);
}
