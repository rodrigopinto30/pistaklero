"use client";

import { Briefcase, Building2, Newspaper, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/i18n/navigation";
import { SECTION_HREF, type Section, sectionOf } from "./sections";

// Publicaciones con un diario: el globo de diálogo queda para los mensajes (cuando existan).
const ICONS = { jobs: Briefcase, companies: Building2, posts: Newspaper, talent: UsersRound } as const;

/** Empleos · Empresas · Publicaciones. La actual se marca con aria-current y una línea abajo. */
export function SectionTabs({ className, showTalent = false }: { className?: string; showTalent?: boolean }) {
  const t = useTranslations("Header");
  const current = sectionOf(usePathname());
  const nav = useRef<HTMLElement>(null);

  // En el celular las pestañas se deslizan de costado: la actual queda a la vista.
  useEffect(() => {
    const scroller = nav.current;
    const active = scroller?.querySelector<HTMLElement>("[aria-current=page]");
    if (!scroller || !active || scroller.scrollWidth <= scroller.clientWidth) return;
    const box = scroller.getBoundingClientRect();
    const tab = active.getBoundingClientRect();
    scroller.scrollLeft += tab.left + tab.width / 2 - (box.left + box.width / 2);
  }, [current]);

  return (
    <nav ref={nav} aria-label={t("sections")} className={className}>
      {/* "center-safe": si no entran, empiezan desde la izquierda (centradas, el principio quedaría cortado). */}
      <ul className="flex w-max min-w-full items-center justify-center-safe gap-1 sm:gap-4">
        {(Object.keys(SECTION_HREF) as Section[]).filter((section) => section !== "talent" || showTalent).map((section) => {
          const Icon = ICONS[section];
          const active = current === section;
          return (
            <li key={section}>
              <Link
                href={SECTION_HREF[section]}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  // La línea de la pestaña activa, como en Airbnb.
                  "after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-foreground after:opacity-0 after:transition-opacity",
                  active && "after:opacity-100"
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                {t(`tabs.${section}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
