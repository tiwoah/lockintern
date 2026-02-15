"use client";

import type { Lang } from "@/context/LanguageContext";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={cn("flex rounded-lg border border-border bg-muted/50 p-0.5", className)}
      role="tablist"
      aria-label="Language"
    >
      {(["en", "fr"] as const).map((l) => (
        <Button
          key={l}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          aria-label={l === "en" ? "English" : "Français"}
          className={cn(
            "h-7 min-w-9 rounded-md px-2 text-xs font-medium transition-colors",
            lang === l
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {l === "en" ? "EN" : "FR"}
        </Button>
      ))}
    </div>
  );
}
