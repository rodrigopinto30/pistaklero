"use client";

import { ArrowUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Tip } from "@/components/tip";

// Aparece después de bajar un par de pantallas: antes no hace falta.
const subscribe = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
};
const isFarDown = () => window.scrollY > window.innerHeight * 1.5;

/** Botón flotante para volver arriba. Al usarlo, el foco va al logo (WCAG 2.4.3: el foco sigue a la vista). */
export function BackToTop() {
  const t = useTranslations("Layout");
  const visible = useSyncExternalStore(subscribe, isFarDown, () => false);
  if (!visible) return null;

  const goUp = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    document.querySelector<HTMLElement>("[data-home-link]")?.focus({ preventScroll: true });
  };

  return (
    <Tip label={t("backToTop")} side="left">
    <button
      type="button"
      onClick={goUp}
      aria-label={t("backToTop")}
      className="fixed right-4 bottom-4 z-40 flex size-12 items-center justify-center rounded-full bg-card text-foreground shadow-soft-lg transition-[transform,box-shadow] animate-in fade-in zoom-in-90 hover:-translate-y-0.5 hover:shadow-soft-lg sm:right-6 sm:bottom-6 motion-reduce:animate-none motion-reduce:transition-none"
    >
      <ArrowUp aria-hidden="true" className="size-5" />
    </button>
    </Tip>
  );
}
