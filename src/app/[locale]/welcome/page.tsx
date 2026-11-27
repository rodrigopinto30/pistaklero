import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { getPathname, redirect } from "@/i18n/navigation";
import { WelcomeForm } from "./welcome-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Welcome");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function WelcomePage() {
  const locale = await getLocale();
  const user = await getCurrentUser();
  if (!user) {
    const next = getPathname({ locale, href: "/welcome" });
    redirect({ href: { pathname: "/sign-in", query: { next } }, locale });
  }
  if (await getCurrentProfile()) redirect({ href: "/", locale });

  const t = await getTranslations("Welcome");

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-8 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <WelcomeForm locale={locale} defaultName={user?.name ?? ""} />
    </div>
  );
}
