"use client";

import { Languages } from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { type AppLocale, routing } from "@/i18n/routing";

// Cada idioma se nombra en su propio idioma (recomendación de i18n del W3C).
const LOCALE_LABELS: Record<AppLocale, { short: string; name: string }> = {
  es: { short: "ESP", name: "Español" },
  en: { short: "ENG", name: "English" },
};

/*
 * Un solo botón que lleva al otro idioma, en la misma página.
 * El nombre accesible empieza con el texto visible (WCAG 2.5.3) y suma el nombre completo:
 * un lector de pantalla anuncia "ENG – English", en inglés por el atributo lang.
 */
export function LocaleSwitcher() {
  const currentLocale = useLocale();
  const pathname = usePathname();
  const params = useParams();

  const targetLocale =
    routing.locales.find((locale) => locale !== currentLocale) ??
    routing.defaultLocale;
  const { short, name } = LOCALE_LABELS[targetLocale];

  return (
    <Link
      // @ts-expect-error -- pathname y params vienen de la ruta actual, así que siempre coinciden.
      href={{ pathname, params }}
      locale={targetLocale}
      lang={targetLocale}
      hrefLang={targetLocale}
      aria-label={`${short} – ${name}`}
      className={buttonVariants({ variant: "outline" })}
    >
      <Languages aria-hidden="true" />
      {short}
    </Link>
  );
}
