import { Briefcase, Search } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { SignUpSteps } from "@/components/auth/sign-up-steps";
import { buttonVariants } from "@/components/ui/button";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/redirect";
import { parseSignUpRole } from "@/lib/auth/sign-up";
import { getPathname, Link, redirect } from "@/i18n/navigation";
import { SignUpForm } from "@/components/auth/auth-forms";
import { Emoji } from "@/components/emoji";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SignUp");
  return { title: t("metaTitle"), robots: { index: false } };
}

/*
 * Registro en tres pasos:
 *   1. ¿Qué buscás? (trabajo o talento)
 *   2. Email y contraseña (o Google/GitHub); el email se confirma con un código de 6 dígitos.
 *   3. Los datos personales, en la bienvenida, con el rol ya elegido.
 * Cada paso es una URL (?role=…): funciona sin JavaScript y con el botón "atrás".
 */
export default async function SignUpPage({ searchParams }: PageProps<"/[locale]/sign-up">) {
  const locale = await getLocale();
  if (await getCurrentUser()) {
    redirect({ href: (await getCurrentProfile()) ? "/" : "/welcome", locale });
  }

  const t = await getTranslations("SignUp");
  const params = await searchParams;
  const role = parseSignUpRole(params.role);
  // Adónde volver después del registro (por ejemplo, aceptar una invitación). Solo rutas propias.
  const returnTo = params.next ? safeNextPath(params.next, "") || undefined : undefined;

  if (!role) {
    const options = [
      { role: "candidate", icon: Search, title: t("candidate"), hint: t("candidateHint") },
      { role: "recruiter", icon: Briefcase, title: t("recruiter"), hint: t("recruiterHint") },
    ] as const;
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-8 px-4 py-12">
        <SignUpSteps current={1} />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("chooseTitle")} <Emoji symbol="🧭" /></h1>
          <p className="text-muted-foreground">{t("chooseSubtitle")}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {options.map((option) => (
            <li key={option.role}>
              <Link
                href={{ pathname: "/sign-up", query: returnTo ? { role: option.role, next: returnTo } : { role: option.role } }}
                className="flex h-full flex-col gap-3 rounded-2xl bg-card p-5 shadow-soft transition-shadow hover:shadow-soft-lg"
              >
                <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <option.icon className="size-5" />
                </span>
                <span className="text-lg font-semibold">{option.title}</span>
                <span className="text-sm text-muted-foreground">{option.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">{t("roleNote")}</p>
        <p className="text-sm">
          {t("haveAccount")}{" "}
          <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4">
            {t("signIn")}
          </Link>
        </p>
      </div>
    );
  }

  // Después de Google/GitHub, la bienvenida ya sabe qué eligió (con contraseña, lo lleva el formulario).
  const next = returnTo?.startsWith("/api/team/accept?") ? returnTo : `${getPathname({ locale, href: "/welcome" })}?${new URLSearchParams({ role })}`;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-12">
      <SignUpSteps current={2} />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("emailTitle")} <Emoji symbol="🔐" /></h1>
        <p className="text-muted-foreground">
          {t("chosen", { role: t(role) })}{" "}
          <Link href="/sign-up" className="font-medium text-primary underline underline-offset-4">
            {t("change")}
          </Link>
        </p>
      </div>

      <OAuthButtons next={next} namespace="SignUp" />

      <SignUpForm locale={locale} role={role} next={returnTo} />

      <p className="text-sm">
        {t("haveAccount")}{" "}
        <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
