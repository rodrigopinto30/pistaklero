"use client";

import { ImagePlay } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Gif } from "@/lib/gifs/gifs";

/**
 * Buscar y elegir un GIF de GIPHY (diálogo nativo). Sin texto, muestra los populares.
 * GIPHY pide mostrar "Powered by GIPHY" donde se eligen.
 */
export function GifButton({ disabled, disabledReason, onSelect }: { disabled: boolean; disabledReason: string; onSelect: (gif: Gif) => void }) {
  const t = useTranslations("Editor");
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/gifs?${new URLSearchParams({ q: query, lang: locale })}`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as { gifs: Gif[] };
        setGifs(data.gifs);
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, locale]);

  return (
    <>
      <button
        type="button"
        aria-label={disabled ? `${t("gif")} (${disabledReason})` : t("gif")}
        title={disabled ? disabledReason : t("gif")}
        aria-disabled={disabled || undefined}
        onClick={() => {
          if (disabled) return;
          setOpen(true);
          dialog.current?.showModal();
        }}
        className={buttonVariants({ variant: "ghost", size: "icon-sm", className: disabled ? "cursor-not-allowed opacity-50" : undefined })}
      >
        <ImagePlay aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        className="m-auto hidden h-[min(36rem,calc(100%-2rem))] w-[min(36rem,calc(100%-2rem))] flex-col gap-3 rounded-2xl bg-card p-5 text-foreground shadow-soft-lg backdrop:bg-black/50 open:flex"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold">
            {t("gifTitle")}
          </h2>
          <button type="button" onClick={() => dialog.current?.close()} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {t("close")}
          </button>
        </div>
        <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("gifSearch")} placeholder={t("gifSearch")} autoFocus />
        <div className="flex-1 overflow-y-auto">
          {failed ? (
            <p className="text-sm text-muted-foreground">{t("gifError")}</p>
          ) : !gifs ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : gifs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noGif")}</p>
          ) : (
            <ul className="columns-2 gap-2 sm:columns-3">
              {gifs.map((gif) => (
                <li key={gif.id} className="mb-2 break-inside-avoid">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(gif);
                      dialog.current?.close();
                    }}
                    className="block w-full overflow-hidden rounded-lg outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de GIPHY (animada). */}
                    <img src={gif.preview} alt={gif.title || "GIF"} width={gif.width} height={gif.height} loading="lazy" referrerPolicy="no-referrer" className="h-auto w-full bg-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-right text-xs font-semibold text-muted-foreground">Powered by GIPHY</p>
      </dialog>
    </>
  );
}
