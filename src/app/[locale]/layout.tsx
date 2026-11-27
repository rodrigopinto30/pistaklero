import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";
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
  return {
    title: { default: t("title"), template: `%s · ${t("title")}` },
    description: t("description"),
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0c0b",
  colorScheme: "dark",
};

export default async function LocaleLayout({
  children,
}: LayoutProps<"/[locale]">) {
  await connection();
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations("Layout");

  return (
    <html
      lang={locale}
      className={`dark ${fontVariables} h-full`}
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
