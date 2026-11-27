"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FormMessage, useFocusFirstError, valueOf } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/forms";
import { updateBasics } from "../actions";
import { SubmitButton } from "@/components/forms/submit-button";

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
  const t = useTranslations("Profile.basics");
  const [state, action] = useActionState(updateBasics, idleState);
  const formRef = useFocusFirstError(state);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const v = (name: keyof BasicsValues) => valueOf(state, name, saved[name] as string);

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-4">
      <Field id="basics-headline" name="headline" label={t("headline")} hint={t("headlineHint")} error={errors.headline}>
        {(p) => <Input {...p} maxLength={100} defaultValue={v("headline")} />}
      </Field>
      <Field id="basics-bio" name="bio" label={t("bio")} hint={t("bioHint")} error={errors.bio}>
        {(p) => <Textarea {...p} maxLength={500} defaultValue={v("bio")} />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="basics-country" name="country" label={t("country")} error={errors.country}>
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
        <Field id="basics-city" name="city" label={t("city")} error={errors.city}>
          {(p) => <Input {...p} autoComplete="address-level2" maxLength={80} defaultValue={v("city")} />}
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2" aria-describedby={errors.languages ? "basics-languages-error" : undefined}>
        <legend className="mb-2 text-sm font-medium">{t("languages")}</legend>
        <div className="flex flex-wrap gap-2">
          {languages.map((language) => (
            <label
              key={language.code}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-input px-3 text-sm has-checked:border-primary has-checked:text-primary"
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="basics-githubUrl" name="githubUrl" label={t("githubUrl")} error={errors.githubUrl}>
          {(p) => <Input {...p} type="url" inputMode="url" placeholder="github.com/…" defaultValue={v("githubUrl")} />}
        </Field>
        <Field id="basics-linkedinUrl" name="linkedinUrl" label={t("linkedinUrl")} error={errors.linkedinUrl}>
          {(p) => <Input {...p} type="url" inputMode="url" placeholder="linkedin.com/in/…" defaultValue={v("linkedinUrl")} />}
        </Field>
        <Field id="basics-websiteUrl" name="websiteUrl" label={t("websiteUrl")} error={errors.websiteUrl}>
          {(p) => <Input {...p} type="url" inputMode="url" autoComplete="url" defaultValue={v("websiteUrl")} />}
        </Field>
      </div>

      <SubmitButton />
      <FormMessage state={state} />
    </form>
  );
}
