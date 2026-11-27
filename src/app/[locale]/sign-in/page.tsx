import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { getEnabledOAuthProviders, OAUTH_PROVIDER_NAMES } from "@/lib/auth/providers";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { Link, redirect } from "@/i18n/navigation";
import { SignInForm } from "@/components/auth/auth-forms";
import { Emoji } from "@/components/emoji";

const CALLBACK_ERRORS = ["callback", "link_expired"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function SignInPage({ searchParams }: PageProps<"/[locale]/sign-in">) {
  const locale = await getLocale();
  const params = await searchParams;
  const user = await getCurrentUser();
  // Con sesión, solo se vuelve a pedir la contraseña para confirmar algo delicado (borrar la cuenta).
  const reauth = Boolean(user) && params.reauth === "1";
  if (user && !reauth) {
    redirect({ href: (await getCurrentProfile()) ? "/" : "/welcome", locale });
  }

  const t = await getTranslations("Auth");
  const next = safeNextPath(params.next, `/${locale}`);
  const error = CALLBACK_ERRORS.find((code) => code === params.error);
  const providers = getEnabledOAuthProviders();

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{reauth ? t("reauthTitle") : t("title")} <Emoji symbol={reauth ? "🔐" : "👋"} /></h1>
        <p className="text-muted-foreground">{reauth ? t("reauthSubtitle") : t("subtitle")}</p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {t(`errors.${error}`)}
        </p>
      )}

      {providers.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {providers.map((provider) => {
              const href = `/api/auth/oauth/${provider}?${new URLSearchParams({ next })}`;
              return (
                <li key={provider}>
                  <a href={href} className={buttonVariants({ variant: "outline", className: "w-full" })}>
                    {t("continueWith", { provider: OAUTH_PROVIDER_NAMES[provider] })}
                  </a>
                </li>
              );
            })}
          </ul>
          <p className="text-center text-sm text-muted-foreground">{t("or")}</p>
        </>
      )}

      <SignInForm locale={locale} next={next} fixedEmail={reauth ? (user?.email ?? undefined) : undefined} />

      {!reauth && (
      <p className="text-center text-sm">
        {t("noAccount")}{" "}
        {/* Si venía de algún lado (una invitación, una acción pendiente), el registro vuelve ahí. */}
        <Link href={{ pathname: "/sign-up", query: params.next ? { next } : {} }} className="font-medium text-primary underline underline-offset-4">
          {t("signUp")}
        </Link>
      </p>
      )}
    </div>
  );
}
