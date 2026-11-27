"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FormMessage, useFocusFirstError, valueOf } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/forms";
import type { EntryBlock } from "@/lib/validation/profile";
import { deleteEntry, saveEntry } from "../actions";
import { SubmitButton } from "./submit-button";

type FieldConfig = { name: string; label: string; type: "text" | "textarea" | "month" | "url"; required?: boolean; max?: number };

// Campos de cada bloque. `label` es la clave dentro de Profile.entries.<bloque>.
const FIELDS: Record<EntryBlock, FieldConfig[]> = {
  experience: [
    { name: "title", label: "title_field", type: "text", required: true, max: 80 },
    { name: "companyName", label: "companyName", type: "text", required: true, max: 80 },
    { name: "startDate", label: "startDate", type: "month", required: true },
    { name: "endDate", label: "endDate", type: "month" },
    { name: "description", label: "description", type: "textarea", max: 1000 },
  ],
  education: [
    { name: "degree", label: "degree", type: "text", required: true, max: 120 },
    { name: "institution", label: "institution", type: "text", required: true, max: 120 },
    { name: "startDate", label: "startDate", type: "month", required: true },
    { name: "endDate", label: "endDate", type: "month" },
  ],
  certification: [
    { name: "name", label: "name", type: "text", required: true, max: 120 },
    { name: "issuer", label: "issuer", type: "text", max: 120 },
    { name: "issuedOn", label: "issuedOn", type: "month" },
    { name: "credentialUrl", label: "credentialUrl", type: "url" },
  ],
  project: [
    { name: "title", label: "title_field", type: "text", required: true, max: 80 },
    { name: "description", label: "description", type: "textarea", max: 500 },
    { name: "url", label: "url", type: "url" },
    { name: "repoUrl", label: "repoUrl", type: "url" },
  ],
};

export type EntryItem = { id: string; heading: string; subheading: string; period: string | null; values: Record<string, string> };

function EntryForm({ block, entry }: { block: EntryBlock; entry?: EntryItem }) {
  const t = useTranslations("Profile.entries");
  const [state, action] = useActionState(saveEntry, idleState);
  const formRef = useFocusFirstError(state);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const prefix = `${block}-${entry?.id ?? "new"}`;

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-4 pt-3">
      <input type="hidden" name="block" value={block} />
      {entry && <input type="hidden" name="id" value={entry.id} />}
      {FIELDS[block].map((field) => {
        const hint = field.type === "month" ? t(field.name === "endDate" ? "endHint" : "monthHint") : undefined;
        return (
          <Field
            key={field.name}
            id={`${prefix}-${field.name}`}
            name={field.name}
            // La clave se arma con el bloque y el campo; las dos existen en Profile.entries (lo verifica el test de traducciones).
            label={t(`${block}.${field.label}` as Parameters<typeof t>[0])}
            required={field.required}
            hint={hint}
            error={errors[field.name]}
          >
            {(p) =>
              field.type === "textarea" ? (
                <Textarea {...p} maxLength={field.max} defaultValue={valueOf(state, field.name, entry?.values[field.name])} />
              ) : (
                <Input
                  {...p}
                  type={field.type === "text" ? "text" : field.type}
                  inputMode={field.type === "url" ? "url" : undefined}
                  placeholder={field.type === "month" ? "2024-03" : undefined}
                  maxLength={field.max}
                  defaultValue={valueOf(state, field.name, entry?.values[field.name])}
                />
              )
            }
          </Field>
        );
      })}
      <SubmitButton label={entry ? undefined : t(`${block}.add`)} />
      <FormMessage state={state} />
    </form>
  );
}

export function EntriesSection({ block, entries }: { block: EntryBlock; entries: EntryItem[] }) {
  const t = useTranslations("Profile.entries");

  return (
    <div className="flex flex-col gap-3">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t(`${block}.empty`)}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <h3 className="font-medium">{entry.heading}</h3>
                  {entry.subheading && <p className="text-sm text-muted-foreground">{entry.subheading}</p>}
                  {entry.period && <p className="text-sm text-muted-foreground">{entry.period}</p>}
                </div>
                <form action={deleteEntry}>
                  <input type="hidden" name="block" value={block} />
                  <input type="hidden" name="id" value={entry.id} />
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label={t("deleteItem", { item: entry.heading })}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </form>
              </div>
              <details className="mt-2">
                <summary className="inline-flex min-h-9 cursor-pointer items-center rounded-md text-sm text-violet underline-offset-4 hover:underline">
                  {t("editItem", { item: entry.heading })}
                </summary>
                <EntryForm block={block} entry={entry} />
              </details>
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary className="inline-flex min-h-10 cursor-pointer items-center rounded-md font-medium text-primary underline-offset-4 hover:underline">
          {t(`${block}.add`)}
        </summary>
        <EntryForm block={block} />
      </details>
    </div>
  );
}
