"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FieldGrid, FormMessage, useFocusFirstError, valueOf } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/forms";
import { EMPLOYMENT_TYPES, SENIORITIES, VALID_DAYS, WORK_MODES } from "@/lib/validation/job";
import { CURRENCIES, SALARY_BASES, SALARY_PERIODS } from "@/lib/validation/profile";
import { type ExtractState, extractPosting, publishImportedJob } from "./actions";

type Option = { code: string; name: string };

function ReviewForm({ proposed, countries }: { proposed: Record<string, string>; countries: Option[] }) {
  const t = useTranslations("Import");
  const tj = useTranslations("Jobs");
  const [state, action] = useActionState(publishImportedJob, idleState);
  const formRef = useFocusFirstError(state);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const v = (name: string, fallback = "") => valueOf(state, name, proposed[name] ?? fallback);

  if (state.status === "success") {
    return (
      <p role="status" className="rounded-xl bg-primary/10 p-4 text-primary">
        {t("published")}
      </p>
    );
  }

  const select = (name: string, options: readonly string[], label: (o: string) => string, empty?: string) =>
    function SelectControl(p: object) {
      return (
        <NativeSelect {...p} defaultValue={v(name)}>
          {empty !== undefined && <option value="">{empty}</option>}
          {options.map((o) => (
            <option key={o} value={o}>
              {label(o)}
            </option>
          ))}
        </NativeSelect>
      );
    };

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-4">
      <FieldGrid className="sm:grid-cols-2">
        <Field id="imp-companyName" name="companyName" label={t("companyName")} required error={errors.companyName}>
          {(p) => <Input {...p} maxLength={80} defaultValue={v("companyName")} />}
        </Field>
        <Field id="imp-companyWebsite" name="companyWebsite" label={t("companyWebsite")} error={errors.companyWebsite}>
          {(p) => <Input {...p} type="url" inputMode="url" defaultValue={v("companyWebsite")} />}
        </Field>
      </FieldGrid>
      <Field id="imp-externalUrl" name="externalUrl" label={t("externalUrl")} required hint={t("externalUrlHint")} error={errors.externalUrl}>
        {(p) => <Input {...p} type="url" inputMode="url" defaultValue={v("externalUrl")} />}
      </Field>
      <Field id="imp-title" name="title" label={tj("title")} required error={errors.title}>
        {(p) => <Input {...p} maxLength={100} defaultValue={v("title")} />}
      </Field>
      <Field id="imp-summary" name="summary" label={t("summary")} required hint={t("summaryHint")} error={errors.summary}>
        {(p) => <Textarea {...p} maxLength={600} defaultValue={v("summary")} />}
      </Field>
      <FieldGrid className="sm:grid-cols-4">
        <Field id="imp-language" name="language" label={tj("language")} required>
          {select("language", ["es", "en"], (o) => (o === "es" ? "Español" : "English"))}
        </Field>
        <Field id="imp-seniority" name="seniority" label={tj("seniority")} required>
          {select("seniority", SENIORITIES, (o) => tj(`seniorityOptions.${o as (typeof SENIORITIES)[number]}`))}
        </Field>
        <Field id="imp-employmentType" name="employmentType" label={tj("employmentType")} required>
          {select("employmentType", EMPLOYMENT_TYPES, (o) => tj(`employmentOptions.${o as (typeof EMPLOYMENT_TYPES)[number]}`))}
        </Field>
        <Field id="imp-workMode" name="workMode" label={tj("workMode")} required>
          {select("workMode", WORK_MODES, (o) => tj(`workModeOptions.${o as (typeof WORK_MODES)[number]}`))}
        </Field>
      </FieldGrid>
      <FieldGrid className="sm:grid-cols-3">
        <Field id="imp-country" name="country" label={tj("country")} error={errors.country}>
          {(p) => (
            <NativeSelect {...p} defaultValue={v("country")}>
              <option value="">{tj("noCountry")}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field id="imp-city" name="city" label={tj("city")} error={errors.city}>
          {(p) => <Input {...p} maxLength={80} defaultValue={v("city")} />}
        </Field>
        <Field id="imp-validDays" name="validDays" label={tj("validDays")} required>
          {select("validDays", VALID_DAYS, (o) => tj("validDaysOption", { days: o }))}
        </Field>
      </FieldGrid>
      <fieldset className="flex flex-col gap-3 rounded-xl bg-muted/60 p-4">
        <legend className="px-1 font-medium">{t("salary")}</legend>
        <p className="text-sm text-muted-foreground">{t("salaryHint")}</p>
        <FieldGrid className="sm:grid-cols-5">
          <Field id="imp-salaryMin" name="salaryMin" label={tj("salaryMin")} error={errors.salaryMin}>
            {(p) => <Input {...p} type="number" inputMode="decimal" min="1" step="any" defaultValue={v("salaryMin")} />}
          </Field>
          <Field id="imp-salaryMax" name="salaryMax" label={tj("salaryMax")} error={errors.salaryMax}>
            {(p) => <Input {...p} type="number" inputMode="decimal" min="1" step="any" defaultValue={v("salaryMax")} />}
          </Field>
          <Field id="imp-salaryCurrency" name="salaryCurrency" label={tj("salaryCurrency")}>
            {select("salaryCurrency", CURRENCIES, (o) => o, "—")}
          </Field>
          <Field id="imp-salaryPeriod" name="salaryPeriod" label={tj("salaryPeriod")}>
            {select("salaryPeriod", SALARY_PERIODS, (o) => tj(`periodShort.${o as (typeof SALARY_PERIODS)[number]}`), "—")}
          </Field>
          <Field id="imp-salaryBasis" name="salaryBasis" label={tj("salaryBasis")}>
            {select("salaryBasis", SALARY_BASES, (o) => tj(`basisShort.${o as (typeof SALARY_BASES)[number]}`), "—")}
          </Field>
        </FieldGrid>
      </fieldset>
      <SubmitButton label={t("publish")} requireChanges={false} />
      <FormMessage state={state} success="published" />
    </form>
  );
}

export function ImportForm({ aiEnabled, countries, locale }: { aiEnabled: boolean; countries: Option[]; locale: string }) {
  const t = useTranslations("Import");
  const [extraction, extract] = useActionState<ExtractState, FormData>(extractPosting, { status: "idle" });
  const proposed =
    extraction.status === "extracted"
      ? extraction.values
      : { language: locale, seniority: "junior", employmentType: "full_time", workMode: "remote", validDays: "30" };

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="import-ai" className="flex flex-col gap-3 rounded-2xl bg-card shadow-soft p-5">
        <h2 id="import-ai" className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles aria-hidden="true" className="size-5 text-primary" />
          {t("aiTitle")}
        </h2>
        {aiEnabled ? (
          <form action={extract} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="import-posting">{t("posting")}</Label>
              <Textarea id="import-posting" name="posting" maxLength={20_000} className="min-h-40" aria-describedby="import-posting-hint" />
              <p id="import-posting-hint" className="text-sm text-muted-foreground">
                {t("postingHint")}
              </p>
            </div>
            <SubmitButton label={t("extract")} variant="secondary" />
            <p role="status" className="text-sm empty:hidden">
              {extraction.status === "extracted" && <span className="text-primary">{t("extracted")}</span>}
              {extraction.status === "error" && <span className="text-destructive">{t(`errors.${extraction.code}`)}</span>}
            </p>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">{t("aiDisabled")}</p>
        )}
      </section>

      <section aria-labelledby="import-review" className="flex flex-col gap-3 rounded-2xl bg-card shadow-soft p-5">
        <h2 id="import-review" className="text-lg font-semibold">
          {t("reviewTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("reviewHint")}</p>
        {/* Cada extracción nueva vuelve a montar el formulario con los valores propuestos. */}
        <ReviewForm key={extraction.status === "extracted" ? extraction.run : "manual"} proposed={proposed} countries={countries} />
      </section>
    </div>
  );
}
