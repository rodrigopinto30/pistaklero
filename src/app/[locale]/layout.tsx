import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";
import { getPublicEnv } from "@/lib/env";
import { getTheme } from "@/lib/theme/server";
import { DARK_MODE_ENABLED, THEME_COLOR } from "@/lib/theme/theme";
import { fontVariables } from "../fonts";
import "../globals.css";

/*
 * Todas las páginas se renderizan por pedido: la CSP usa un nonce distinto en cada pedido,
 * y una página prerenderizada no lo tendría en sus <script>.
 * Los datos se pueden seguir cacheando con "use cache".
 */
export const instant = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  const locale = await getLocale();
  return {
    // Base para las URLs absolutas (canonical, hreflang, Open Graph).
    metadataBase: new URL(getPublicEnv().NEXT_PUBLIC_SITE_URL),
    title: { default: t("title"), template: `%s · ${t("title")}` },
    description: t("description"),
    openGraph: { siteName: t("title"), type: "website", locale: locale === "en" ? "en_US" : "es_AR" },
  };
}

// El tema real lo define la clase de <html> (y su color-scheme en CSS); leer la cookie acá bloquearía la página.
export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  colorScheme: DARK_MODE_ENABLED ? "dark light" : "light",
};

export default async function LocaleLayout({
  children,
}: LayoutProps<"/[locale]">) {
  await connection();
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations("Layout");
  const theme = await getTheme();

  return (
    <html
      lang={locale}
      className={`${theme} ${fontVariables} h-full`}
    >
      <body className="flex min-h-full flex-col">
        {/* Primer elemento enfocable: salta el encabezado (WCAG 2.4.1). */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:font-medium focus:text-primary-foreground"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          <SiteHeader />
          <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
