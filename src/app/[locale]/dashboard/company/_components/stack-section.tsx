"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { idleState } from "@/lib/forms";
import { addCompanySkill, removeCompanySkill } from "../actions";

type Skill = { id: string; name: string };

export function StackSection({ catalog, selected }: { catalog: Skill[]; selected: Skill[] }) {
  const t = useTranslations("Company.stack");
  const [state, action] = useActionState(addCompanySkill, idleState);
  const selectedIds = new Set(selected.map((s) => s.id));

  return (
    <div className="flex flex-col gap-4">
      {selected.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {selected.map((skill) => (
            <li key={skill.id} className="inline-flex items-center gap-1 rounded-full bg-secondary py-1 pr-1 pl-3 text-sm">
              {skill.name}
              <form action={removeCompanySkill}>
                <input type="hidden" name="skillId" value={skill.id} />
                <Button type="submit" variant="ghost" size="icon-sm" className="size-7 rounded-full" aria-label={t("removeSkill", { skill: skill.name })}>
                  <X aria-hidden="true" />
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="stack-skill">{t("skill")}</Label>
          <NativeSelect id="stack-skill" name="skillId" defaultValue="" required>
            <option value="" disabled>
              {t("choose")}
            </option>
            {catalog
              .filter((s) => !selectedIds.has(s.id))
              .map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
          </NativeSelect>
        </div>
        <SubmitButton label={t("add")} variant="secondary" />
      </form>
      <FormMessage state={state} success="techAdded" />
    </div>
  );
}
