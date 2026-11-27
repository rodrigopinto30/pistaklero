"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FormMessage, useFocusFirstError, valueOf } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { idleState } from "@/lib/forms";
import { CURRENCIES, SALARY_BASES, SALARY_PERIODS } from "@/lib/validation/profile";
import { deleteSalary, saveSalary } from "../actions";
import { SubmitButton } from "./submit-button";

export type SalaryValues = {
  amount: string;
  currency: string;
  period: string;
  basis: string;
  salaryVisibility: string;
} | null;

export function SalaryForm({ saved }: { saved: SalaryValues }) {
  const t = useTranslations("Profile.salary");
  const [state, action] = useActionState(saveSalary, idleState);
  const formRef = useFocusFirstError(state);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const v = (name: keyof NonNullable<SalaryValues>, fallback: string) => valueOf(state, name, saved?.[name] ?? fallback);

  return (
    <div className="flex flex-col gap-3">
      <form ref={formRef} action={action} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="salary-amount" name="amount" label={t("amount")} required error={errors.amount}>
            {(p) => <Input {...p} type="number" inputMode="decimal" min="1" step="any" defaultValue={v("amount", "")} />}
          </Field>
          <Field id="salary-currency" name="currency" label={t("currency")} required error={errors.currency}>
            {(p) => (
              <NativeSelect {...p} defaultValue={v("currency", "USD")}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field id="salary-period" name="period" label={t("period")} required error={errors.period}>
            {(p) => (
              <NativeSelect {...p} defaultValue={v("period", "month")}>
                {SALARY_PERIODS.map((o) => (
                  <option key={o} value={o}>
                    {t(`periodOptions.${o}`)}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field id="salary-basis" name="basis" label={t("basis")} required error={errors.basis}>
            {(p) => (
              <NativeSelect {...p} defaultValue={v("basis", "gross")}>
                {SALARY_BASES.map((o) => (
                  <option key={o} value={o}>
                    {t(`basisOptions.${o}`)}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
        </div>
        <Field id="salary-visibility" name="salaryVisibility" label={t("visibility")} required error={errors.salaryVisibility}>
          {(p) => (
            <NativeSelect {...p} defaultValue={v("salaryVisibility", "private")}>
              <option value="private">{t("visibilityOptions.private")}</option>
              <option value="applied_companies">{t("visibilityOptions.applied_companies")}</option>
            </NativeSelect>
          )}
        </Field>
        <SubmitButton />
        <FormMessage state={state} />
      </form>
      {saved && (
        <form action={deleteSalary}>
          <Button type="submit" variant="destructive">
            {t("remove")}
          </Button>
        </form>
      )}
    </div>
  );
}
