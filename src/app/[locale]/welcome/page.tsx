import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { SignUpSteps } from "@/components/auth/sign-up-steps";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { parseSignUpRole } from "@/lib/auth/sign-up";
import { getPathname, redirect } from "@/i18n/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { WelcomeForm } from "./welcome-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Welcome");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function WelcomePage({ searchParams }: PageProps<"/[locale]/welcome">) {
  const locale = await getLocale();
  const user = await getCurrentUser();
  if (!user) {
    const next = getPathname({ locale, href: "/welcome" });
    redirect({ href: { pathname: "/sign-in", query: { next } }, locale });
  }
  if (await getCurrentProfile()) redirect({ href: "/", locale });

  const t = await getTranslations("Welcome");
  // Si viene del registro, el rol ya está elegido: este es el último paso.
  const params = await searchParams;
  const presetRole = parseSignUpRole(params.role);
  // Adónde seguir al terminar (por ejemplo, la oferta a la que se quería postular). Solo rutas propias.
  const next = params.next ? safeNextPath(params.next, "") || undefined : undefined;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-8 px-4 py-12">
      {presetRole && <SignUpSteps current={3} />}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{presetRole ? t("detailsTitle") : t("title")}</h1>
        <p className="text-muted-foreground">{presetRole ? t("detailsSubtitle") : t("subtitle")}</p>
      </div>
      <WelcomeForm locale={locale} defaultName={user?.name ?? ""} presetRole={presetRole} next={next} />
    </div>
  );
}
