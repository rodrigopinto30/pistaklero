"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, startTransition, useActionState, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Emoji } from "@/components/emoji";
import { FormMessage, useFocusFirstError, valueOf } from "@/components/forms/field";
import { ImagePicker } from "@/components/forms/image-picker";
import { SkillChips } from "@/components/forms/skill-chips";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/forms";
import { COVER_MAX_BYTES } from "@/lib/validation/company";
import { completeCandidateSetup } from "../actions";
import { type BasicsValues, BasicsFields } from "./basics-form";
import { EntryFields } from "./entries-section";
import { AVAILABILITY, RadioGroup, VISIBILITY } from "./preferences-form";
import { SalaryFields } from "./salary-form";

type Option = { code: string; name: string };
const BLOCKS = ["experience", "education", "project"] as const;

/**
 * Alta de la candidata: todo el perfil en un solo formulario, uno debajo del otro, y un único
 * "Finalizar registro". Los botones de guardar por sección aparecen recién después, para editar.
 * Se envía a mano (sin el reinicio automático de React): si algo falla, nada de lo escrito se pierde.
 */
export function CandidateSetupForm({
  locale,
  name,
  saved,
  countries,
  languages,
  skills,
}: {
  locale: string;
  name: string;
  saved: BasicsValues;
  countries: Option[];
  languages: Option[];
  skills: { id: string; name: string }[];
}) {
  const t = useTranslations("Profile");
  const tSetup = useTranslations("Profile.setup");
  const tPerson = useTranslations("Person.avatar");
  const tPrefs = useTranslations("Profile.preferences");
  const [state, action, pending] = useActionState(completeCandidateSetup, idleState);
  const formRef = useFocusFirstError(state);
  const errors = state.status === "error" ? state.fieldErrors : {};
  // Cada bloque arranca vacío; "Agregar" suma un grupo de campos (y "Quitar" lo saca).
  const [groups, setGroups] = useState<Record<(typeof BLOCKS)[number], number[]>>({ experience: [], education: [], project: [] });
  const [next, setNext] = useState(0);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
  const add = (block: (typeof BLOCKS)[number]) => {
    setGroups((current) => ({ ...current, [block]: [...current[block], next] }));
    setNext((n) => n + 1);
  };
  const remove = (block: (typeof BLOCKS)[number], key: number) =>
    setGroups((current) => ({ ...current, [block]: current[block].filter((k) => k !== key) }));
  const value = (field: string, fallback = "") => valueOf(state, field, fallback);

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <SectionCard id="setup-photo" title={tSetup("photo")} description={tSetup("photoHint")}>
        <ImagePicker
          name="avatar"
          label={tPerson("file")}
          hint={tPerson("hint")}
          shape="round"
          maxBytes={COVER_MAX_BYTES}
          placeholder={<Avatar path={null} name={name} size="xl" />}
          error={errors.avatar ? tSetup("imageError") : null}
        />
      </SectionCard>

      <SectionCard id="setup-basics" title={t("basics.title")}>
        <div className="flex flex-col gap-4">
          <BasicsFields
            idPrefix="setup"
            saved={saved}
            countries={countries}
            languages={languages}
            errors={errors}
            value={(field) => value(field, (saved[field] as string) ?? "")}
          />
        </div>
      </SectionCard>

      <SectionCard id="setup-skills" title={t("skills.title")} description={tSetup("skillsHint")}>
        <SkillChips name="skillIds" label={t("skills.skill")} catalog={skills} />
      </SectionCard>

      {BLOCKS.map((block) => (
        <SectionCard key={block} id={`setup-${block}`} title={t(`entries.${block}.title`)} description={tSetup(`${block}Hint`)}>
          <div className="flex flex-col gap-4">
            {groups[block].map((key, index) => (
              <div key={key} role="group" aria-label={tSetup("itemN", { n: index + 1 })} className="group/entry flex flex-col gap-4 rounded-xl bg-muted/50 p-4">
                <EntryFields
                  block={block}
                  idPrefix={`setup-${block}-${key}`}
                  namePrefix={`${block}.${key}.`}
                  errors={errors}
                  value={(field) => value(`${block}.${key}.${field}`)}
                  current={state.status === "error" && state.values[`${block}.${key}.current`] === "on"}
                />
                <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => remove(block, key)}>
                  <X aria-hidden="true" />
                  {tSetup("removeItem")}
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" className="self-start" onClick={() => add(block)}>
              <Plus aria-hidden="true" />
              {t(`entries.${block}.add`)}
            </Button>
          </div>
        </SectionCard>
      ))}

      <SectionCard id="setup-preferences" title={tPrefs("title")}>
        <div className="flex flex-col gap-4">
          <RadioGroup name="availability" legend={tPrefs("availability")} options={AVAILABILITY} labels={(o) => tPrefs(`availabilityOptions.${o}`)} saved="immediate" />
          <RadioGroup name="visibility" legend={tPrefs("visibility")} options={VISIBILITY} labels={(o) => tPrefs(`visibilityOptions.${o}`)} saved="companies_only" />
        </div>
      </SectionCard>

      <SectionCard id="setup-salary" title={tSetup("salary")} description={t("salary.hint")}>
        <div className="flex flex-col gap-4">
          <SalaryFields idPrefix="setup-salary" errors={errors} value={(field, fallback) => value(field, fallback)} optional />
        </div>
      </SectionCard>

      <FormMessage state={state} />
      <Button type="submit" size="lg" disabled={pending} className="self-stretch sm:self-start">
        {pending ? tSetup("submitting") : tSetup("submit")}
        {!pending && <Emoji symbol="🎉" />}
      </Button>
    </form>
  );
}
