import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { routing } from "./routing";

/*
 * El idioma sale del segmento [locale] con next/root-params, no de las cabeceras.
 * Así las páginas no dependen del pedido para conocer su idioma.
 *
 * next/root-params no existe en Server Actions ni en Route Handlers: ahí se cae a la
 * cabecera que agrega el proxy. Igual, lo recomendado es pasar el idioma explícito
 * (getTranslations({ locale, namespace })).
 */
export default getRequestConfig(async ({ locale: override, requestLocale }) => {
  let requested: string | undefined = override;
  if (!requested) {
    try {
      requested = await rootLocale();
    } catch {
      requested = await requestLocale;
    }
  }

  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
