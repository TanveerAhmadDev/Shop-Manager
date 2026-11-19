"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "ur";

interface LanguageContextType {
  language: Language;
  isUrdu: boolean;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  // Restore the saved language when the application loads.
  useEffect(() => {
    const savedLanguage = localStorage.getItem("app-language");

    if (savedLanguage === "ur" || savedLanguage === "en") {
      setLanguageState(savedLanguage);
    }
  }, []);

  // Update the complete document direction and language.
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
  }, [language]);

  function setLanguage(newLanguage: Language) {
    localStorage.setItem("app-language", newLanguage);
    setLanguageState(newLanguage);
  }

  function toggleLanguage() {
    setLanguage(language === "en" ? "ur" : "en");
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        isUrdu: language === "ur",
        setLanguage,
        toggleLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}
