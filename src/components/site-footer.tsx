import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground">
        <p>{t("tagline")}</p>
        <nav aria-label={t("label")}>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            <li>
              <Link href="/legal/terms" className="inline-flex min-h-6 items-center underline-offset-4 hover:underline">
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className="inline-flex min-h-6 items-center underline-offset-4 hover:underline">
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/accessibility" className="inline-flex min-h-6 items-center underline-offset-4 hover:underline">
                {t("accessibility")}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
