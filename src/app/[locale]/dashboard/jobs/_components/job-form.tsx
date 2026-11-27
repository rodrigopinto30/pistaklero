"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FieldGrid, FormMessage, useFocusFirstError, valueOf } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { useFormChanged } from "@/components/forms/use-form-changed";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/forms";
import { CURRENCIES, SALARY_BASES, SALARY_PERIODS } from "@/lib/validation/profile";
import { EMPLOYMENT_TYPES, QUESTION_TYPES, SENIORITIES, VALID_DAYS, WORK_MODES } from "@/lib/validation/job";
import { saveJob } from "../actions";

export type JobFormValues = Record<string, string> & { skills: string };
type Option = { code: string; name: string };
type SkillGroup = { category: string; label: string; skills: { id: string; name: string }[] };

function Fieldset({ legend, hint, children }: { legend: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-2xl bg-card shadow-soft p-5">
      <legend className="px-1 text-lg font-semibold">{legend}</legend>
      {hint && <p className="-mt-2 text-sm text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  );
}

export function JobForm({
  locale,
  jobId,
  saved,
  countries,
  skillGroups,
  mode,
}: {
  locale: string;
  jobId?: string;
  saved: JobFormValues;
  countries: Option[];
  skillGroups: SkillGroup[];
  /** "draft": se puede publicar o guardar como borrador. "live": ya salió; guardar no cambia el estado. */
  mode: "draft" | "live";
}) {
  const t = useTranslations("Jobs");
  const [state, action, pending] = useActionState(saveJob, idleState);
  // Editando una oferta publicada, "Guardar cambios" se activa recién cuando algo cambió.
  const { button: saveButton, changed } = useFormChanged(mode !== "draft");
  const tForm = useTranslations("Form");
  const formRef = useFocusFirstError(state);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const v = (name: string) => valueOf(state, name, saved[name]);
  const selectedSkills = new Set(v("skills").split(",").filter(Boolean));

  const select = (name: string, options: readonly string[], label: (o: string) => string) =>
    function SelectControl(p: object) {
      return (
    <NativeSelect {...p} defaultValue={v(name)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {label(o)}
        </option>
      ))}
    </NativeSelect>
      );
    };

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="locale" value={locale} />
      {jobId && <input type="hidden" name="jobId" value={jobId} />}

      <Fieldset legend={t("sections.basics")}>
        <Field id="job-title" name="title" label={t("title")} required hint={t("titleHint")} error={errors.title}>
          {(p) => <Input {...p} maxLength={100} defaultValue={v("title")} />}
        </Field>
        <Field id="job-description" name="description" label={t("description")} required hint={t("descriptionHint")} error={errors.description}>
          {(p) => <Textarea {...p} className="min-h-56" maxLength={8000} defaultValue={v("description")} />}
        </Field>
        <Field id="job-language" name="language" label={t("language")} required error={errors.language}>
          {(p) => (
            <NativeSelect {...p} defaultValue={v("language")}>
              <option value="es" lang="es">Español</option>
              <option value="en" lang="en">English</option>
            </NativeSelect>
          )}
        </Field>
      </Fieldset>

      <Fieldset legend={t("sections.conditions")}>
        <FieldGrid className="sm:grid-cols-3">
          <Field id="job-seniority" name="seniority" label={t("seniority")} required error={errors.seniority}>
            {select("seniority", SENIORITIES, (o) => t(`seniorityOptions.${o as (typeof SENIORITIES)[number]}`))}
          </Field>
          <Field id="job-employmentType" name="employmentType" label={t("employmentType")} required error={errors.employmentType}>
            {select("employmentType", EMPLOYMENT_TYPES, (o) => t(`employmentOptions.${o as (typeof EMPLOYMENT_TYPES)[number]}`))}
          </Field>
          <Field id="job-workMode" name="workMode" label={t("workMode")} required error={errors.workMode}>
            {select("workMode", WORK_MODES, (o) => t(`workModeOptions.${o as (typeof WORK_MODES)[number]}`))}
          </Field>
        </FieldGrid>
        <FieldGrid className="sm:grid-cols-3">
          <Field id="job-country" name="country" label={t("country")} error={errors.country}>
            {(p) => (
              <NativeSelect {...p} defaultValue={v("country")}>
                <option value="">{t("noCountry")}</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field id="job-city" name="city" label={t("city")} error={errors.city}>
            {(p) => <Input {...p} maxLength={80} defaultValue={v("city")} />}
          </Field>
          <Field id="job-validDays" name="validDays" label={t("validDays")} required error={errors.validDays}>
            {select("validDays", VALID_DAYS, (o) => t("validDaysOption", { days: o }))}
          </Field>
        </FieldGrid>
      </Fieldset>

      <Fieldset legend={t("sections.salary")} hint={t("salaryHint")}>
        <FieldGrid className="sm:grid-cols-2 lg:grid-cols-5">
          <Field id="job-salaryMin" name="salaryMin" label={t("salaryMin")} required error={errors.salaryMin}>
            {(p) => <Input {...p} type="number" inputMode="decimal" min="1" step="any" defaultValue={v("salaryMin")} />}
          </Field>
          <Field id="job-salaryMax" name="salaryMax" label={t("salaryMax")} required error={errors.salaryMax}>
            {(p) => <Input {...p} type="number" inputMode="decimal" min="1" step="any" defaultValue={v("salaryMax")} />}
          </Field>
          <Field id="job-salaryCurrency" name="salaryCurrency" label={t("salaryCurrency")} required error={errors.salaryCurrency}>
            {select("salaryCurrency", CURRENCIES, (o) => o)}
          </Field>
          <Field id="job-salaryPeriod" name="salaryPeriod" label={t("salaryPeriod")} required error={errors.salaryPeriod}>
            {select("salaryPeriod", SALARY_PERIODS, (o) => t(`periodShort.${o as (typeof SALARY_PERIODS)[number]}`))}
          </Field>
          <Field id="job-salaryBasis" name="salaryBasis" label={t("salaryBasis")} required error={errors.salaryBasis}>
            {select("salaryBasis", SALARY_BASES, (o) => t(`basisShort.${o as (typeof SALARY_BASES)[number]}`))}
          </Field>
        </FieldGrid>
      </Fieldset>

      <Fieldset legend={t("sections.skills")} hint={t("skillsHint")}>
        {errors.skills && <p className="text-sm text-destructive">{t("skillsHint")}</p>}
        <div className="flex flex-col gap-4">
          {skillGroups.map((group) => (
            <div key={group.category} role="group" aria-labelledby={`skills-${group.category}`} className="flex flex-col gap-2">
              <p id={`skills-${group.category}`} className="text-sm font-medium text-muted-foreground">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.skills.map((skill) => (
                  <label
                    key={skill.id}
                    className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-secondary px-3 text-sm has-checked:bg-primary/10 has-checked:text-primary"
                  >
                    <input type="checkbox" name="skills" value={skill.id} defaultChecked={selectedSkills.has(skill.id)} className="size-4 accent-primary" />
                    {skill.name}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Fieldset>

      <Fieldset legend={t("sections.questions")} hint={t("questionsHint")}>
        {([1, 2] as const).map((n) => (
          <div key={n} role="group" aria-labelledby={`question${n}-title`} className="flex flex-col gap-3 rounded-xl bg-muted/60 p-4">
            <p id={`question${n}-title`} className="font-medium">
              {t("questionN", { n })}
            </p>
            <FieldGrid className="sm:grid-cols-[12rem_1fr]">
              <Field id={`job-question${n}Type`} name={`question${n}Type`} label={t("questionType")}>
                {select(`question${n}Type`, QUESTION_TYPES, (o) => t(`questionTypes.${o as (typeof QUESTION_TYPES)[number]}`))}
              </Field>
              <Field id={`job-question${n}Prompt`} name={`question${n}Prompt`} label={t("questionPrompt")} error={errors[`question${n}Prompt`]}>
                {(p) => <Input {...p} maxLength={200} defaultValue={v(`question${n}Prompt`)} />}
              </Field>
            </FieldGrid>
            <Field id={`job-question${n}Options`} name={`question${n}Options`} label={t("questionOptions")} error={errors[`question${n}Options`]}>
              {(p) => <Textarea {...p} className="min-h-20" maxLength={500} defaultValue={v(`question${n}Options`)} />}
            </Field>
          </div>
        ))}
      </Fieldset>

      <FormMessage state={state} success="jobSaved" />
      <div className="flex flex-wrap gap-2">
        {mode === "draft" ? (
          <>
            <Button type="submit" name="intent" value="publish" disabled={pending}>
              {t("publish")}
            </Button>
            <Button type="submit" name="intent" value="draft" variant="outline" disabled={pending}>
              {t("saveDraft")}
            </Button>
          </>
        ) : (
          <Button
            ref={saveButton}
            type="submit"
            name="intent"
            value="save"
            disabled={pending}
            aria-disabled={!changed || undefined}
            title={changed ? undefined : tForm("noChanges")}
            onClick={(event) => {
              if (!changed) event.preventDefault();
            }}
            className={changed ? undefined : "cursor-not-allowed opacity-50"}
          >
            {t("saveChanges")}
          </Button>
        )}
      </div>
    </form>
  );
}
