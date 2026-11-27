"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormMessage } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { idleState } from "@/lib/forms";
import { SKILL_LEVELS } from "@/lib/validation/profile";
import { addSkill, removeSkill, updateSkillLevel } from "../actions";
import { SubmitButton } from "./submit-button";

export type CatalogSkill = { id: string; name: string; category: string };
export type SelectedSkill = { skillId: string; name: string; level: (typeof SKILL_LEVELS)[number] };

const CATEGORIES = ["language", "framework", "tool", "data", "design", "marketing", "soft"] as const;

function LevelForm({ skill }: { skill: SelectedSkill }) {
  const t = useTranslations("Profile.skills");
  const [state, action] = useActionState(updateSkillLevel, idleState);
  const id = `skill-level-${skill.skillId}`;

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="skillId" value={skill.skillId} />
      <Label htmlFor={id} className="sr-only">
        {t("levelOf", { skill: skill.name })}
      </Label>
      <NativeSelect
        id={id}
        name="level"
        defaultValue={skill.level}
        // Guarda apenas cambia: sin JavaScript queda el botón de abajo.
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-9 w-36"
      >
        {SKILL_LEVELS.map((level) => (
          <option key={level} value={level}>
            {t(`levelOptions.${level}`)}
          </option>
        ))}
      </NativeSelect>
      <noscript>
        <SubmitButton variant="outline" />
      </noscript>
      <span className="sr-only" role="status">
        {state.status === "success" ? "✓" : ""}
      </span>
    </form>
  );
}

export function SkillsSection({ catalog, selected }: { catalog: CatalogSkill[]; selected: SelectedSkill[] }) {
  const t = useTranslations("Profile.skills");
  const [state, action] = useActionState(addSkill, idleState);
  const selectedIds = new Set(selected.map((s) => s.skillId));
  const available = catalog.filter((s) => !selectedIds.has(s.id));

  return (
    <div className="flex flex-col gap-4">
      {selected.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {selected.map((skill) => (
            <li key={skill.skillId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <span className="font-medium">{skill.name}</span>
              <span className="flex items-center gap-1">
                <LevelForm skill={skill} />
                <form action={removeSkill}>
                  <input type="hidden" name="skillId" value={skill.skillId} />
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label={t("removeSkill", { skill: skill.name })}>
                    <X aria-hidden="true" />
                  </Button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="skill-add">{t("skill")}</Label>
          <NativeSelect id="skill-add" name="skillId" defaultValue="" required>
            <option value="" disabled>
              {t("choose")}
            </option>
            {CATEGORIES.map((category) => {
              const options = available.filter((s) => s.category === category);
              if (options.length === 0) return null;
              return (
                <optgroup key={category} label={t(`categories.${category}`)}>
                  {options.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2 sm:w-40">
          <Label htmlFor="skill-add-level">{t("level")}</Label>
          <NativeSelect id="skill-add-level" name="level" defaultValue="intermediate">
            {SKILL_LEVELS.map((level) => (
              <option key={level} value={level}>
                {t(`levelOptions.${level}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <SubmitButton label={t("add")} variant="secondary" />
      </form>
      <FormMessage state={state} />
    </div>
  );
}
