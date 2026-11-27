"use client";

import { BadgeCheck, CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FormMessage, useFocusFirstError, valueOf } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/forms";
import { updateCompanyWebsite } from "../actions";

export function WebsiteForm({ websiteUrl, domain, verified }: { websiteUrl: string; domain: string | null; verified: boolean }) {
  const t = useTranslations("Company.website");
  const [state, action] = useActionState(updateCompanyWebsite, idleState);
  const formRef = useFocusFirstError(state);
  const errors = state.status === "error" ? state.fieldErrors : {};

  return (
    <div className="flex flex-col gap-4">
      {/* Estado con ícono y texto, nunca solo color (WCAG 1.4.1). */}
      {verified && domain ? (
        <p className="flex items-start gap-2 text-sm text-primary">
          <BadgeCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("verified", { domain })}
        </p>
      ) : (
        <div className="flex flex-col gap-1 text-sm text-warn">
          <p className="flex items-start gap-2">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t("unverified")}
          </p>
          <p className="text-muted-foreground">{t("unverifiedLimit")}</p>
        </div>
      )}
      <form ref={formRef} action={action} noValidate className="flex flex-col gap-4">
        <Field id="company-websiteUrl" name="websiteUrl" label={t("websiteUrl")} hint={t("changeWarning")} error={errors.websiteUrl}>
          {(p) => <Input {...p} type="url" inputMode="url" autoComplete="url" placeholder="acme.com" defaultValue={valueOf(state, "websiteUrl", websiteUrl)} />}
        </Field>
        <SubmitButton />
        <FormMessage state={state} />
      </form>
    </div>
  );
}
