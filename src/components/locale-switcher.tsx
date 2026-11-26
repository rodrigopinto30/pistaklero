"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { type AppLocale, routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

// Cada idioma se nombra en su propio idioma (recomendación de i18n del W3C).
const LOCALE_NAMES: Record<AppLocale, string> = {
  es: "Español",
  en: "English",
};

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const currentLocale = useLocale();
  const pathname = usePathname();
  const params = useParams();

  return (
    <nav aria-label={t("label")}>
      <ul className="flex items-center gap-1">
        {routing.locales.map((locale) => {
          const isCurrent = locale === currentLocale;
          return (
            <li key={locale}>
              <Link
                // @ts-expect-error -- pathname y params vienen de la ruta actual, así que siempre coinciden.
                href={{ pathname, params }}
                locale={locale}
                lang={locale}
                hrefLang={locale}
                aria-current={isCurrent ? "true" : undefined}
                className={cn(
                  "inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted",
                  isCurrent ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {LOCALE_NAMES[locale]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
