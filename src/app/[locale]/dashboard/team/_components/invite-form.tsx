"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FormMessage, useFocusFirstError, valueOf } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { idleState } from "@/lib/forms";
import { inviteMember } from "../actions";

export function InviteForm({ locale }: { locale: string }) {
  const t = useTranslations("Team");
  const [state, action] = useActionState(inviteMember, idleState);
  const formRef = useFocusFirstError(state);
  const errors = state.status === "error" ? state.fieldErrors : {};

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <Field id="invite-email" name="email" label={t("email")} required hint={t("emailHint")} error={errors.email}>
          {(p) => <Input {...p} type="email" inputMode="email" autoComplete="off" defaultValue={state.status === "success" ? "" : valueOf(state, "email", "")} />}
        </Field>
        <Field id="invite-locale" name="inviteLocale" label={t("emailLanguage")} required>
          {(p) => (
            <NativeSelect {...p} defaultValue={valueOf(state, "inviteLocale", locale)}>
              <option value="es" lang="es">Español</option>
              <option value="en" lang="en">English</option>
            </NativeSelect>
          )}
        </Field>
      </div>
      <SubmitButton label={t("invite")} />
      <FormMessage state={state} success="invited" />
    </form>
  );
}
