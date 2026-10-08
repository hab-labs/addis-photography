"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { en, TranslationKey } from "./en";
import { am } from "./am";

type Locale = "en" | "am";

interface I18nContextType {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: TranslationKey;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: en,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("addis_locale") as Locale;
    if (saved && (saved === "en" || saved === "am")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (loc: Locale) => {
    setLocaleState(loc);
    localStorage.setItem("addis_locale", loc);
  };

  const currentDict = locale === "am" ? am : en;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: currentDict }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  return useContext(I18nContext);
}
