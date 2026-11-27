"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FieldGrid, FormMessage, useFocusFirstError, valueOf } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { type FieldError, idleState } from "@/lib/forms";
import { updateBasics } from "../actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { RichTextarea } from "@/components/editor/rich-textarea";

type Option = { code: string; name: string };

export type BasicsValues = {
  headline: string;
  bio: string;
  country: string;
  city: string;
  languages: string[];
  githubUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
};

export function BasicsForm({ saved, countries, languages }: { saved: BasicsValues; countries: Option[]; languages: Option[] }) {
  const [state, action] = useActionState(updateBasics, idleState);
  const formRef = useFocusFirstError(state);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const v = (name: keyof BasicsValues) => valueOf(state, name, saved[name] as string);

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-4">
      <BasicsFields idPrefix="basics" saved={saved} countries={countries} languages={languages} errors={errors} value={v} />
      <SubmitButton />
      <FormMessage state={state} />
    </form>
  );
}

/** Los campos de "Datos básicos" (también los usa el alta en un paso). */
export function BasicsFields({
  idPrefix,
  saved,
  countries,
  languages,
  errors,
  value,
}: {
  idPrefix: string;
  saved: BasicsValues;
  countries: Option[];
  languages: Option[];
  errors: Record<string, FieldError>;
  value: (name: keyof BasicsValues) => string;
}) {
  const t = useTranslations("Profile.basics");
  const v = value;
  return (
    <>
      <Field id={`${idPrefix}-headline`} name="headline" label={t("headline")} hint={t("headlineHint")} error={errors.headline}>
        {(p) => <Input {...p} maxLength={100} defaultValue={v("headline")} />}
      </Field>
      <Field id={`${idPrefix}-bio`} name="bio" label={t("bio")} hint={t("bioHint")} error={errors.bio}>
        {(p) => <RichTextarea {...p} maxLength={500} defaultValue={v("bio")} />}
      </Field>
      <FieldGrid>
        <Field id={`${idPrefix}-country`} name="country" label={t("country")} error={errors.country}>
          {(p) => (
            <NativeSelect {...p} autoComplete="country" defaultValue={v("country")}>
              <option value="">{t("noCountry")}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field id={`${idPrefix}-city`} name="city" label={t("city")} error={errors.city}>
          {(p) => <Input {...p} autoComplete="address-level2" maxLength={80} defaultValue={v("city")} />}
        </Field>
      </FieldGrid>

      <fieldset className="flex flex-col gap-2" aria-describedby={errors.languages ? `${idPrefix}-languages-error` : undefined}>
        <legend className="mb-2 text-sm font-medium">{t("languages")}</legend>
        <div className="flex flex-wrap gap-2">
          {languages.map((language) => (
            <label
              key={language.code}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-secondary px-3 text-sm has-checked:bg-primary/10 has-checked:text-primary"
            >
              <input
                type="checkbox"
                name="languages"
                value={language.code}
                defaultChecked={saved.languages.includes(language.code)}
                className="size-4 accent-primary"
              />
              <span lang={language.code}>{language.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Uno debajo del otro: así se lee la dirección completa. */}
      <div className="flex flex-col gap-4">
        <Field id={`${idPrefix}-githubUrl`} name="githubUrl" label={t("githubUrl")} error={errors.githubUrl}>
          {(p) => <Input {...p} type="url" inputMode="url" placeholder="github.com/…" defaultValue={v("githubUrl")} />}
        </Field>
        <Field id={`${idPrefix}-linkedinUrl`} name="linkedinUrl" label={t("linkedinUrl")} error={errors.linkedinUrl}>
          {(p) => <Input {...p} type="url" inputMode="url" placeholder="linkedin.com/in/…" defaultValue={v("linkedinUrl")} />}
        </Field>
        <Field id={`${idPrefix}-websiteUrl`} name="websiteUrl" label={t("websiteUrl")} error={errors.websiteUrl}>
          {(p) => <Input {...p} type="url" inputMode="url" autoComplete="url" defaultValue={v("websiteUrl")} />}
        </Field>
      </div>

    </>
  );
}
