import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";

export async function SiteHeader() {
  const t = await getTranslations("Layout");

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          aria-label={t("homeLink")}
          className="rounded-md text-lg font-semibold tracking-tight"
        >
          Pista<span className="text-primary">klero</span>
        </Link>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
