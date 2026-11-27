"use client";

import { ArrowRight, Search } from "lucide-react";
import Form from "next/form";
import { useLocale, useTranslations } from "next-intl";
import { type ComponentProps, useEffect, useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";

export type PaletteLink = { href: ComponentProps<typeof Link>["href"]; label: string };

/*
 * Búsqueda rápida (Ctrl+K / ⌘K). Es un extra: el buscador del inicio siempre está visible.
 * <dialog> nativo: atrapa el foco, Esc cierra y el foco vuelve adonde estaba.
 */
export function CommandPalette({ links }: { links: PaletteLink[] }) {
  const t = useTranslations("CommandPalette");
  const locale = useLocale();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    inputRef.current?.select();
  };
  const close = () => dialogRef.current?.close();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={t("open")}
        aria-keyshortcuts="Control+K Meta+K"
        title={`${t("open")} (Ctrl+K)`}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <Search aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="palette-title"
        // Clic afuera (en el fondo) cierra, como en cualquier ventana modal.
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        className="mx-auto mt-[12vh] w-[min(36rem,calc(100%-2rem))] rounded-2xl border border-border bg-card p-0 text-foreground backdrop:bg-black/70"
      >
        <div className="flex flex-col gap-4 p-5">
          <h2 id="palette-title" className="text-lg font-semibold">
            {t("title")}
          </h2>
          <Form action={`/${locale}`} role="search" onSubmit={close} className="flex flex-col gap-2">
            <Label htmlFor="palette-q">{t("searchLabel")}</Label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input ref={inputRef} id="palette-q" name="q" type="search" autoComplete="off" placeholder={t("placeholder")} className="pl-9" />
            </div>
          </Form>
          <nav aria-labelledby="palette-goto">
            <h3 id="palette-goto" className="mb-2 text-sm font-medium text-muted-foreground">
              {t("goTo")}
            </h3>
            <ul className="flex flex-col">
              {links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    onClick={close}
                    className="flex min-h-10 items-center justify-between rounded-lg px-3 hover:bg-muted"
                  >
                    {link.label}
                    <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
      </dialog>
    </>
  );
}
