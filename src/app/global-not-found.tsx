import type { Metadata } from "next";
import { headers } from "next/headers";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { NotFoundContent } from "@/components/not-found-content";
import { type AppLocale, routing } from "@/i18n/routing";
import { fontVariables } from "./fonts";
import "./globals.css";

/*
 * 404 de las URLs que no existen. Next la sirve sin pasar por app/[locale]/layout.tsx,
 * así que el idioma se lee de la cabecera que agrega el proxy de next-intl.
 * Como depende de cada pedido, se renderiza por pedido en lugar de prerenderizarse.
 */
export const instant = false;

async function resolveLocale(): Promise<AppLocale> {
  const value = (await headers()).get("x-next-intl-locale") ?? undefined;
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  const t = await getTranslations({ locale, namespace: "NotFound" });
  const tMeta = await getTranslations({ locale, namespace: "Metadata" });
  return { title: `${t("title")} · ${tMeta("title")}` };
}

export default async function GlobalNotFound() {
  const locale = await resolveLocale();

  return (
    <html lang={locale} className={`dark ${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">
        <main id="main-content" className="flex flex-1 flex-col">
          <NotFoundContent locale={locale} />
        </main>
      </body>
    </html>
  );
}
