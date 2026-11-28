import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { isAiImportEnabled } from "@/lib/ai/extract-job";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { countryOptions } from "@/lib/geo";
import { getPathname, redirect } from "@/i18n/navigation";
import { ImportForm } from "./import-form";
import { SourcesSection } from "./sources-section";
import { BackLink } from "@/components/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Import");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function ImportPage() {
  const locale = await getLocale();
  if (!(await getCurrentUser())) {
    redirect({ href: { pathname: "/sign-in", query: { next: getPathname({ locale, href: "/admin/import" }) } }, locale });
  }
  if ((await getCurrentProfile())?.role !== "admin") redirect({ href: "/", locale });

  const t = await getTranslations("Import");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <BackLink fallback="/admin" />
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ImportForm aiEnabled={isAiImportEnabled()} countries={countryOptions(locale)} locale={locale} />
      <SourcesSection />
    </div>
  );
}
