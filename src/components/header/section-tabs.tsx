"use client";

import { Briefcase, Building2, Newspaper } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/i18n/navigation";
import { SECTION_HREF, type Section, sectionOf } from "./sections";

// Publicaciones con un diario: el globo de diálogo queda para los mensajes (cuando existan).
const ICONS = { jobs: Briefcase, companies: Building2, posts: Newspaper } as const;

/** Empleos · Empresas · Publicaciones. La actual se marca con aria-current y una línea abajo. */
export function SectionTabs({ className }: { className?: string }) {
  const t = useTranslations("Header");
  const current = sectionOf(usePathname());

  return (
    <nav aria-label={t("sections")} className={className}>
      <ul className="flex items-center justify-center gap-1 sm:gap-4">
        {(Object.keys(SECTION_HREF) as Section[]).map((section) => {
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
