"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "lockintern-lang";

export type Lang = "en" | "fr";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (stored === "en" || stored === "fr") return stored;
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLangState(getInitialLang());
    setMounted(true);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value: LanguageContextValue = mounted
    ? { lang, setLang }
    : { lang: "en", setLang: () => {} };

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
