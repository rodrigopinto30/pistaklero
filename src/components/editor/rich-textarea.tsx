"use client";

import { useTranslations } from "next-intl";
import { type ComponentProps, useRef, useState } from "react";
import { useFeatures } from "@/components/features";
import { Textarea } from "@/components/ui/textarea";
import { countGifs, type Gif, gifMarkdown, MAX_GIFS } from "@/lib/gifs/gifs";
import { cn } from "@/lib/utils";
import { EmojiButton } from "./emoji-button";
import { GifButton } from "./gif-button";

/**
 * Textarea con una barra para sumar emojis y GIFs donde está el cursor. Se usa en todos los textos
 * que describen algo (publicaciones, ofertas, "Quiénes somos", "Sobre mí", experiencia, proyectos).
 * Hasta 3 GIFs por texto (el servidor también lo controla). Sigue siendo un textarea común:
 * funciona sin JavaScript y con el teclado.
 */
export function RichTextarea({ className, defaultValue, ...props }: ComponentProps<typeof Textarea>) {
  const t = useTranslations("Editor");
  const { gifs } = useFeatures();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [gifCount, setGifCount] = useState(() => countGifs(String(defaultValue ?? "")));

  /** Inserta en la posición del cursor y avisa al formulario (para "Guardar" y el contador). */
  const insert = (text: string) => {
    const element = textarea.current;
    if (!element) return;
    element.focus();
    element.setRangeText(text, element.selectionStart, element.selectionEnd, "end");
    element.dispatchEvent(new Event("input", { bubbles: true }));
    setGifCount(countGifs(element.value));
  };

  const addGif = (gif: Gif) => {
    const element = textarea.current;
    const before = element ? element.value.slice(0, element.selectionStart) : "";
    // El GIF va en su propio párrafo.
    insert(`${before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : ""}${gifMarkdown(gif)}\n\n`);
  };

  return (
    <div className="flex flex-col rounded-lg border border-input bg-field focus-within:outline-2 focus-within:outline-ring">
      <div role="toolbar" aria-label={t("toolbar")} className="flex items-center gap-1 border-b border-input/40 px-1.5 py-1">
        <EmojiButton onSelect={insert} />
        {gifs && <GifButton disabled={gifCount >= MAX_GIFS} disabledReason={t("gifLimit", { max: MAX_GIFS })} onSelect={addGif} />}
        <span className="ml-auto pr-1.5 text-xs text-muted-foreground">{t("markdownHint")}</span>
      </div>
      <Textarea
        ref={textarea}
        defaultValue={defaultValue}
        onInput={(event) => setGifCount(countGifs(event.currentTarget.value))}
        className={cn("rounded-t-none border-0 bg-transparent focus-visible:outline-none", className)}
        {...props}
      />
    </div>
  );
}
