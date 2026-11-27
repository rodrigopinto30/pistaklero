"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { idleState } from "@/lib/forms";
import { Link } from "@/i18n/navigation";
import { type DeleteState, deleteAccount, updateAccountPreferences } from "./actions";

export function PreferencesForm({ emailLocale, emailNotifications }: { emailLocale: string; emailNotifications: boolean }) {
  const t = useTranslations("Settings.preferences");
  const [state, action] = useActionState(updateAccountPreferences, idleState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="settings-locale">{t("emailLocale")}</Label>
        <NativeSelect id="settings-locale" name="emailLocale" defaultValue={emailLocale} className="w-56" aria-describedby="settings-locale-hint">
          <option value="es" lang="es">Español</option>
          <option value="en" lang="en">English</option>
        </NativeSelect>
        <p id="settings-locale-hint" className="text-sm text-muted-foreground">
          {t("emailLocaleHint")}
        </p>
      </div>
      <label className="flex min-h-10 cursor-pointer items-start gap-3">
        <input type="checkbox" name="emailNotifications" defaultChecked={emailNotifications} className="mt-1 size-4 accent-primary" aria-describedby="settings-notifications-hint" />
        <span className="flex flex-col">
          <span className="font-medium">{t("notifications")}</span>
          <span id="settings-notifications-hint" className="text-sm text-muted-foreground">
            {t("notificationsHint")}
          </span>
        </span>
      </label>
      <SubmitButton />
      <FormMessage state={state} />
    </form>
  );
}

export function DeleteAccountForm({ locale, reauthHref }: { locale: string; reauthHref: string }) {
  const t = useTranslations("Settings.delete");
  const [state, action] = useActionState<DeleteState, FormData>(deleteAccount, { status: "idle" });

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <label className="flex min-h-10 cursor-pointer items-start gap-3">
        <input type="checkbox" name="confirm" required className="mt-1 size-4 accent-primary" />
        <span>{t("confirm")}</span>
      </label>
      <SubmitButton label={t("button")} variant="secondary" />
      <p role="status" className="text-sm empty:hidden">
        {state.status === "error" && state.code === "reauth" ? (
          <span className="text-destructive">
            {t("errors.reauth")}{" "}
            <Link href={reauthHref as "/"} className="underline underline-offset-4">
              {t("reauthLink")}
            </Link>
          </span>
        ) : state.status === "error" ? (
          <span className="text-destructive">{t(`errors.${state.code}`)}</span>
        ) : null}
      </p>
    </form>
  );
}
