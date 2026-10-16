import { create } from "zustand";
import { persist } from "zustand/middleware";
import { translations, Locale } from "@/lib/translations";

interface LanguageStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      locale: "id",
      setLocale: (locale) => set({ locale }),
      toggleLocale: () =>
        set((state) => ({ locale: state.locale === "id" ? "en" : "id" })),
    }),
    {
      name: "gmc-language-store",
    }
  )
);

export function useTranslation() {
  const locale = useLanguageStore((state) => state.locale);
  const setLocale = useLanguageStore((state) => state.setLocale);
  const toggleLocale = useLanguageStore((state) => state.toggleLocale);

  return {
    locale,
    language: locale,
    setLocale,
    toggleLocale,
    t: {
      ...translations[locale],
      locale,
    },
  };
}
