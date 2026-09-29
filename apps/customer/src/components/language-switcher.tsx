"use client";

import { useLanguage } from "@/lib/i18n/language-context";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex shrink-0 items-center overflow-hidden rounded-full border border-border text-[11.5px] font-bold">
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={
          locale === "en"
            ? "bg-accent px-2.5 py-1 text-white"
            : "px-2.5 py-1 text-muted-table hover:text-ink-dark"
        }
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("ur")}
        aria-pressed={locale === "ur"}
        className={
          locale === "ur"
            ? "bg-accent px-2.5 py-1 text-white"
            : "px-2.5 py-1 text-muted-table hover:text-ink-dark"
        }
      >
        اردو
      </button>
    </div>
  );
}
