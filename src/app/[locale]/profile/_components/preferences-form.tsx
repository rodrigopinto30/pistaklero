"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormMessage } from "@/components/forms/field";
import { idleState } from "@/lib/forms";
import { updatePreferences } from "../actions";
import { SubmitButton } from "./submit-button";

const AVAILABILITY = ["immediate", "two_weeks", "freelance_only", "not_looking"] as const;
const VISIBILITY = ["companies_only", "public", "hidden"] as const;

function RadioGroup<T extends string>({
  name,
  legend,
  options,
  labels,
  saved,
}: {
  name: string;
  legend: string;
  options: readonly T[];
  labels: (option: T) => string;
  saved: T;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      {options.map((option) => (
        <label
          key={option}
          className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg border border-input px-3 py-2 text-sm has-checked:border-primary"
        >
          <input type="radio" name={name} value={option} defaultChecked={saved === option} className="size-4 accent-primary" />
          {labels(option)}
        </label>
      ))}
    </fieldset>
  );
}

export function PreferencesForm({
  availability,
  visibility,
}: {
  availability: (typeof AVAILABILITY)[number];
  visibility: (typeof VISIBILITY)[number];
}) {
  const t = useTranslations("Profile.preferences");
  const [state, action] = useActionState(updatePreferences, idleState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <RadioGroup
        name="availability"
        legend={t("availability")}
        options={AVAILABILITY}
        labels={(o) => t(`availabilityOptions.${o}`)}
        saved={availability}
      />
      <RadioGroup
        name="visibility"
        legend={t("visibility")}
        options={VISIBILITY}
        labels={(o) => t(`visibilityOptions.${o}`)}
        saved={visibility}
      />
      <SubmitButton />
      <FormMessage state={state} />
    </form>
  );
}
