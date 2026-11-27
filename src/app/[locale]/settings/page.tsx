import { Download } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { SectionCard } from "@/components/section-card";
import { buttonVariants } from "@/components/ui/button";
import { AvatarForm } from "@/components/account/avatar-form";
import { ChangePasswordForm } from "@/components/auth/auth-forms";
import { PersonalForm } from "@/components/account/personal-form";
import { getCurrentPerson, getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { getPathname, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { DeleteAccountForm, PreferencesForm } from "./settings-forms";
import { Emoji } from "@/components/emoji";
import { avatarUrl } from "@/lib/storage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function SettingsPage() {
  const locale = (await getLocale()) as AppLocale;
  const here = getPathname({ locale, href: "/settings" });
  if (!(await getCurrentUser())) redirect({ href: { pathname: "/sign-in", query: { next: here } }, locale });
  const profile = await getCurrentProfile();
  if (!profile) redirect({ href: "/welcome", locale });

  const t = await getTranslations("Settings");
  const tPerson = await getTranslations("Person");
  // La candidata edita su nombre en su perfil, junto al resto de su portfolio.
  const person = profile!.role === "candidate" ? null : await getCurrentPerson();
  const reauthHref = `${getPathname({ locale, href: "/sign-in" })}?${new URLSearchParams({ reauth: "1", next: here })}`;
  const user = await getCurrentUser();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")} <Emoji symbol="⚙️" /></h1>

      {profile!.role !== "candidate" && (
        <SectionCard id="person" title={tPerson("title")} description={tPerson("hint")}>
          <AvatarForm photoUrl={avatarUrl(person?.avatar_path)} name={person?.full_name ?? ""} />
          <PersonalForm
            saved={{
              firstName: person?.first_name ?? "",
              middleName: person?.middle_name ?? "",
              lastName: person?.last_name ?? "",
            }}
          />
        </SectionCard>
      )}

      <SectionCard id="password" title={t("password.title")} description={t("password.hint")}>
        <ChangePasswordForm email={user?.email ?? ""} />
      </SectionCard>

      <SectionCard id="preferences" title={t("preferences.title")}>
        <PreferencesForm emailLocale={profile!.locale} emailNotifications={profile!.email_notifications} />
      </SectionCard>

      <SectionCard id="data" title={t("data.title")} description={t("data.hint")}>
        {/* Descarga directa: la ruta arma el JSON con todos los datos de la cuenta. */}
        <a href="/api/me/export" download className={buttonVariants({ variant: "outline", className: "self-start" })}>
          <Download aria-hidden="true" />
          {t("data.download")}
        </a>
      </SectionCard>

      <SectionCard id="delete" title={t("delete.title")} description={t("delete.hint")} className="border-destructive/40">
        <DeleteAccountForm locale={locale} reauthHref={reauthHref} />
      </SectionCard>
    </div>
  );
}
