import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import type { AppLocale } from "@/i18n/routing";

/*
 * Contenido del 404. Recibe el idioma explícito porque también se usa en global-not-found,
 * que no tiene acceso a los parámetros de la ruta.
 */
export async function NotFoundContent({ locale }: { locale: AppLocale }) {
  const t = await getTranslations({ locale, namespace: "NotFound" });

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("description")}</p>
      {/* La home tiene la misma ruta en todos los idiomas: /es y /en. */}
      <Link href={`/${locale}`} className={buttonVariants()}>
        {t("backHome")}
      </Link>
    </div>
  );
}
