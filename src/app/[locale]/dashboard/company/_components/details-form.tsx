"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FieldGrid, FormMessage, useFocusFirstError, valueOf } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/forms";
import { COMPANY_SIZES, COMPANY_STAGES } from "@/lib/validation/company";
import { updateCompanyDetails } from "../actions";
import { IndustryField } from "./industry-field";

export type CompanyDetailsValues = Record<
  "name" | "description" | "industry" | "size" | "stage" | "country" | "city" | "linkedinUrl" | "xUrl" | "instagramUrl",
  string
>;

export function DetailsForm({ saved, countries }: { saved: CompanyDetailsValues; countries: { code: string; name: string }[] }) {
  const t = useTranslations("Company.details");
  const [state, action] = useActionState(updateCompanyDetails, idleState);
  const formRef = useFocusFirstError(state);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const v = (name: keyof CompanyDetailsValues) => valueOf(state, name, saved[name]);

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-4">
      <Field id="company-name" name="name" label={t("name")} required error={errors.name}>
        {(p) => <Input {...p} autoComplete="organization" maxLength={80} defaultValue={v("name")} />}
      </Field>
      <Field id="company-description" name="description" label={t("description")} hint={t("descriptionHint")} error={errors.description}>
        {(p) => <Textarea {...p} className="min-h-40" maxLength={2000} defaultValue={v("description")} />}
      </Field>
      <IndustryField idPrefix="company" saved={v("industry")} error={errors.industry} />
      <FieldGrid>
        <Field id="company-size" name="size" label={t("size")} error={errors.size}>
          {(p) => (
            <NativeSelect {...p} defaultValue={v("size")}>
              <option value="">{t("noValue")}</option>
              {COMPANY_SIZES.map((size) => (
                <option key={size} value={size}>
                  {t(`sizeOptions.${size}`)}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field id="company-stage" name="stage" label={t("stage")} error={errors.stage}>
          {(p) => (
            <NativeSelect {...p} defaultValue={v("stage")}>
              <option value="">{t("noValue")}</option>
              {COMPANY_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {t(`stageOptions.${stage}`)}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
      </FieldGrid>
      <FieldGrid className="sm:grid-cols-2">
        <Field id="company-country" name="country" label={t("country")} error={errors.country}>
          {(p) => (
            <NativeSelect {...p} defaultValue={v("country")}>
              <option value="">{t("noValue")}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field id="company-city" name="city" label={t("city")} error={errors.city}>
          {(p) => <Input {...p} maxLength={80} defaultValue={v("city")} />}
        </Field>
      </FieldGrid>
      {/* Uno debajo del otro: así se lee la dirección completa. */}
      <div className="flex flex-col gap-4">
        {(["linkedinUrl", "xUrl", "instagramUrl"] as const).map((name) => (
          <Field key={name} id={`company-${name}`} name={name} label={t(name)} error={errors[name]}>
            {(p) => <Input {...p} type="url" inputMode="url" defaultValue={v(name)} />}
          </Field>
        ))}
      </div>
      <SubmitButton />
      <FormMessage state={state} />
    </form>
  );
}
