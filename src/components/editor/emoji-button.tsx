"use client";

import { Popover } from "@base-ui/react/popover";
import { EmojiPicker } from "frimousse";
import { Smile } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Tip } from "@/components/tip";

/** Corrige aria-rowindex / aria-colindex de Frimousse (vienen desde 0; ARIA los pide desde 1). */
function ariaIndex(props: object) {
  const fixed: Record<string, number> = {};
  for (const key of ["aria-rowindex", "aria-colindex"] as const) {
    const value = (props as Record<string, unknown>)[key];
    if (typeof value === "number") fixed[key] = value + 1;
  }
  return fixed;
}

/**
 * Selector de emojis (Frimousse): búsqueda en el idioma del sitio, categorías y teclado completo.
 * Los datos se sirven desde nuestro sitio (/api/emojibase), sin pedir nada a un CDN.
 */
export function EmojiButton({ onSelect }: { onSelect: (emoji: string) => void }) {
  const t = useTranslations("Editor");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tip label={t("emoji")}>
        <Popover.Trigger aria-label={t("emoji")} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
          <Smile aria-hidden="true" />
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" className="z-50">
          <Popover.Popup className="rounded-2xl bg-popover p-2 text-popover-foreground shadow-soft-lg outline-none">
            <EmojiPicker.Root
              locale={locale === "en" ? "en" : "es"}
              emojibaseUrl="/api/emojibase"
              columns={8}
              onEmojiSelect={({ emoji }) => {
                onSelect(emoji);
                setOpen(false);
              }}
              className="flex h-80 w-[min(20rem,calc(100vw-2rem))] flex-col"
            >
              <EmojiPicker.Search aria-label={t("emojiSearch")} placeholder={t("emojiSearch")} className="mb-2 h-9 rounded-lg bg-field px-3 text-sm outline-none ring-1 ring-input focus-visible:ring-2 focus-visible:ring-ring" />
              <EmojiPicker.Viewport className="relative flex-1 outline-none">
                <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">{t("loading")}</EmojiPicker.Loading>
                <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">{t("noEmoji")}</EmojiPicker.Empty>
                <EmojiPicker.List
                  className="select-none pb-1"
                  components={{
                    CategoryHeader: ({ category, ...props }) => (
                      <div {...props} {...ariaIndex(props)} className="bg-popover px-1 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                        {category.label}
                      </div>
                    ),
                    // Frimousse numera filas y columnas desde 0; ARIA pide empezar en 1.
                    Row: ({ children, ...props }) => (
                      <div {...props} {...ariaIndex(props)} className="scroll-my-1">
                        {children}
                      </div>
                    ),
                    Emoji: ({ emoji, ...props }) => (
                      <button {...props} {...ariaIndex(props)} className="flex size-9 items-center justify-center rounded-lg text-xl data-[active]:bg-muted">
                        {emoji.emoji}
                      </button>
                    ),
                  }}
                />
              </EmojiPicker.Viewport>
            </EmojiPicker.Root>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
