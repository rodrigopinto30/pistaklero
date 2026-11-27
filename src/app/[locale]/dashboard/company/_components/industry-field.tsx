"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { FieldError } from "@/lib/forms";
import { INDUSTRIES, isIndustry } from "@/lib/validation/company";

/** Industria: las más comunes en una lista y "Otra…" para escribirla (aparece un campo más). */
export function IndustryField({ idPrefix, saved, error }: { idPrefix: string; saved: string; error?: FieldError }) {
  const t = useTranslations("Industries");
  const td = useTranslations("Company.details");
  const [choice, setChoice] = useState(isIndustry(saved) ? saved : saved ? "other" : "");

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Field id={`${idPrefix}-industry`} name="industryChoice" label={td("industry")} error={choice === "other" ? undefined : error} className="sm:flex-1">
        {(p) => (
          <NativeSelect {...p} value={choice} onChange={(event) => setChoice(event.target.value)}>
            <option value="">{td("noValue")}</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {t(industry)}
              </option>
            ))}
            <option value="other">{t("other")}</option>
          </NativeSelect>
        )}
      </Field>
      {choice === "other" && (
        <Field id={`${idPrefix}-industry-other`} name="industryOther" label={t("otherLabel")} required error={error} className="sm:flex-1">
          {(p) => <Input {...p} maxLength={60} defaultValue={isIndustry(saved) ? "" : saved} />}
        </Field>
      )}
    </div>
  );
}
