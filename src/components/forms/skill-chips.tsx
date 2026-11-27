"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

type Option = { id: string; name: string };

/**
 * Elegir varias opciones de un catálogo como chips (todavía sin guardar: se mandan con el formulario
 * en inputs ocultos). Quitar un chip no pide confirmación porque nada se borró todavía.
 */
export function SkillChips({ name, label, hint, catalog, initial = [] }: { name: string; label: string; hint?: string; catalog: Option[]; initial?: Option[] }) {
  const t = useTranslations("SkillChips");
  const id = useId();
  const [selected, setSelected] = useState<Option[]>(initial);
  const [choice, setChoice] = useState("");
  const available = catalog.filter((option) => !selected.some((s) => s.id === option.id));

  const add = () => {
    const option = catalog.find((o) => o.id === choice);
    if (option) setSelected((current) => [...current, option]);
    setChoice("");
  };

  return (
    <div className="flex flex-col gap-3">
      {selected.map((option) => (
        <input key={option.id} type="hidden" name={name} value={option.id} />
      ))}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor={id}>{label}</Label>
          <NativeSelect id={id} value={choice} onChange={(event) => setChoice(event.target.value)} aria-describedby={hint ? `${id}-hint` : undefined}>
            <option value="">{t("choose")}</option>
            {available.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="button" variant="secondary" onClick={add} disabled={!choice}>
          {t("add")}
        </Button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {selected.length > 0 && (
        <ul aria-label={t("selected")} className="flex flex-wrap gap-2">
          {selected.map((option) => (
            <li key={option.id} className="inline-flex items-center gap-1 rounded-full bg-secondary py-1 pr-1 pl-3 text-sm">
              {option.name}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 rounded-full"
                aria-label={t("remove", { name: option.name })}
                onClick={() => setSelected((current) => current.filter((s) => s.id !== option.id))}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
