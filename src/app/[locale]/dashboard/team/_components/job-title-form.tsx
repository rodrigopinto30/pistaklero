"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FormMessage, useFocusFirstError, valueOf } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/forms";
import { updateMyJobTitle } from "../actions";

/** "Tu cargo en la empresa": aparece al pie de las ofertas que publicás. */
export function JobTitleForm({ saved }: { saved: string }) {
  const t = useTranslations("Team");
  const [state, action] = useActionState(updateMyJobTitle, idleState);
  const formRef = useFocusFirstError(state);
  const errors = state.status === "error" ? state.fieldErrors : {};

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-4">
      <Field id="team-job-title" name="jobTitle" label={t("jobTitle")} hint={t("jobTitleHint")} error={errors.jobTitle}>
        {(p) => <Input {...p} maxLength={80} autoComplete="organization-title" defaultValue={valueOf(state, "jobTitle", saved)} />}
      </Field>
      <SubmitButton />
      <FormMessage state={state} success="jobTitleSaved" />
    </form>
  );
}
