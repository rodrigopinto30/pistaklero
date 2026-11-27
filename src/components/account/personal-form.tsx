"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FormMessage, useFocusFirstError, valueOf } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { savePersonalData } from "@/lib/account/actions";
import { idleState } from "@/lib/forms";
import type { PersonName } from "@/lib/validation/person";

/** Nombre, segundo nombre y apellido, cada uno en su campo. Lo usan el perfil y los ajustes. */
export function PersonalForm({ saved }: { saved: PersonName }) {
  const t = useTranslations("Person");
  const [state, action] = useActionState(savePersonalData, idleState);
  const formRef = useFocusFirstError(state);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const v = (name: keyof PersonName) => valueOf(state, name, saved[name]);

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="person-firstName" name="firstName" label={t("firstName")} required error={errors.firstName}>
          {(p) => <Input {...p} autoComplete="given-name" maxLength={50} defaultValue={v("firstName")} />}
        </Field>
        <Field id="person-middleName" name="middleName" label={t("middleName")} error={errors.middleName}>
          {(p) => <Input {...p} autoComplete="additional-name" maxLength={50} defaultValue={v("middleName")} />}
        </Field>
        <Field id="person-lastName" name="lastName" label={t("lastName")} required error={errors.lastName}>
          {(p) => <Input {...p} autoComplete="family-name" maxLength={50} defaultValue={v("lastName")} />}
        </Field>
      </div>
      <SubmitButton />
      <FormMessage state={state} />
    </form>
  );
}
