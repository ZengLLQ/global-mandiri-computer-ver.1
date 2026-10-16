"use client";

import { useLanguageStore } from "@/stores/language-store";
import { motion } from "framer-motion";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLanguageStore();

  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-card)]/80 shadow-sm text-[10px] font-mono font-bold tracking-wider select-none ${className || ""}`}
      title={locale === "id" ? "Ganti ke Bahasa Inggris" : "Switch to Indonesian"}
    >
      <button
        type="button"
        onClick={() => setLocale("id")}
        className={`relative px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
          locale === "id"
            ? "text-white"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        }`}
      >
        {locale === "id" && (
          <motion.div
            layoutId="langPillHighlight"
            className="absolute inset-0 bg-black rounded-full z-0"
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
          />
        )}
        <span className="relative z-10">ID</span>
      </button>

      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`relative px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
          locale === "en"
            ? "text-white"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        }`}
      >
        {locale === "en" && (
          <motion.div
            layoutId="langPillHighlight"
            className="absolute inset-0 bg-black rounded-full z-0"
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
          />
        )}
        <span className="relative z-10">EN</span>
      </button>
    </div>
  );
}
