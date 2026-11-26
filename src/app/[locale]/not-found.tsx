import { getLocale, getTranslations } from "next-intl/server";
import { NotFoundContent } from "@/components/not-found-content";

/*
 * 404 de las páginas que llaman a notFound() (por ejemplo, una oferta que no existe).
 * Las URLs que directamente no existen las atiende app/global-not-found.tsx.
 */
export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations("NotFound");

  return (
    <>
      <title>{t("title")}</title>
      <NotFoundContent locale={locale} />
    </>
  );
}
