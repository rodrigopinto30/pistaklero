import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { Link } from "@/i18n/navigation";
import { Emoji } from "@/components/emoji";
import { BackLink } from "@/components/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Password");
  return { title: t("metaTitle"), robots: { index: false } };
}

/*
 * Recuperar (o crear) la contraseña en una sola pantalla: el email, después el código de 6 dígitos
 * que llega por mail junto con la contraseña nueva. Sirve también a quien entraba con Google o GitHub.
 */
export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  const t = await getTranslations("Password");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <BackLink fallback="/sign-in" />
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")} <Emoji symbol="🔑" /></h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ForgotPasswordForm locale={locale} />
      <p className="text-center text-sm">
        <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4">
          {t("backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
