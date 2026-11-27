"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Field, FieldGrid, FormMessage, useFocusFirstError, valueOf } from "@/components/forms/field";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/forms";
import type { EntryBlock } from "@/lib/validation/profile";
import { deleteEntry, saveEntry } from "../actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { ConfirmButton } from "@/components/confirm-button";
import { RichTextarea } from "@/components/editor/rich-textarea";

type FieldConfig = { name: string; label: string; type: "text" | "textarea" | "month" | "url"; required?: boolean; max?: number };

/*
 * Campos de cada bloque, por filas: los de una misma fila van lado a lado (alineados con FieldGrid).
 * "current" es el checkbox "sigue en curso": si está marcado, la fecha de fin se oculta.
 * `label` es la clave dentro de Profile.entries.<bloque>.
 */
const LAYOUT: Record<EntryBlock, (FieldConfig[] | "current")[]> = {
  experience: [
    [
      { name: "title", label: "title_field", type: "text", required: true, max: 80 },
      { name: "companyName", label: "companyName", type: "text", required: true, max: 80 },
    ],
    [
      { name: "startDate", label: "startDate", type: "month", required: true },
      { name: "endDate", label: "endDate", type: "month", required: true },
    ],
    "current",
    [{ name: "description", label: "description", type: "textarea", max: 1000 }],
  ],
  education: [
    [
      { name: "degree", label: "degree", type: "text", required: true, max: 120 },
      { name: "institution", label: "institution", type: "text", required: true, max: 120 },
    ],
    [
      { name: "startDate", label: "startDate", type: "month", required: true },
      { name: "endDate", label: "endDate", type: "month", required: true },
    ],
    "current",
  ],
  certification: [
    [
      { name: "name", label: "name", type: "text", required: true, max: 120 },
      { name: "issuer", label: "issuer", type: "text", max: 120 },
    ],
    [{ name: "issuedOn", label: "issuedOn", type: "month" }],
    [{ name: "credentialUrl", label: "credentialUrl", type: "url" }],
  ],
  project: [
    [{ name: "title", label: "title_field", type: "text", required: true, max: 80 }],
    [{ name: "description", label: "description", type: "textarea", max: 500 }],
    // Los enlaces, uno debajo del otro: así se lee la dirección completa.
    [{ name: "url", label: "url", type: "url" }],
    [{ name: "repoUrl", label: "repoUrl", type: "url" }],
  ],
};

export type EntryItem = { id: string; heading: string; subheading: string; period: string | null; values: Record<string, string> };

function EntryForm({ block, entry }: { block: EntryBlock; entry?: EntryItem }) {
  const t = useTranslations("Profile.entries");
  const [state, action] = useActionState(saveEntry, idleState);
  const formRef = useFocusFirstError(state);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const prefix = `${block}-${entry?.id ?? "new"}`;
  // Una entrada guardada sin fecha de fin es una que sigue en curso.
  const current = state.status === "error" ? state.values.current === "on" : Boolean(entry && !entry.values.endDate);

  const renderField = (field: FieldConfig) => (
    <Field
      key={field.name}
      id={`${prefix}-${field.name}`}
      name={field.name}
      // La clave se arma con el bloque y el campo; las dos existen en Profile.entries (lo verifica el test de traducciones).
      label={t(`${block}.${field.label}` as Parameters<typeof t>[0])}
      required={field.required}
      hint={field.type === "month" ? t(field.name === "endDate" ? "endHint" : "monthHint") : undefined}
      error={errors[field.name]}
      // Con "sigue en curso" marcado, la fecha de fin no hace falta: se oculta (y no se envía como dato útil).
      className={field.name === "endDate" ? "group-has-[[name=current]:checked]/entry:hidden" : undefined}
    >
      {(p) =>
        field.type === "textarea" ? (
          <RichTextarea {...p} maxLength={field.max} defaultValue={valueOf(state, field.name, entry?.values[field.name])} />
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

  return (
    <form ref={formRef} action={action} noValidate className="group/entry flex flex-col gap-4 pt-3">
      <input type="hidden" name="block" value={block} />
      {entry && <input type="hidden" name="id" value={entry.id} />}
      {LAYOUT[block].map((row, index) =>
        row === "current" ? (
          <label key="current" className="inline-flex min-h-10 cursor-pointer items-center gap-3 self-start text-sm">
            <input type="checkbox" name="current" defaultChecked={current} className="size-4 accent-primary" />
            {t(`${block}.current` as Parameters<typeof t>[0])}
          </label>
        ) : row.length > 1 ? (
          <FieldGrid key={index}>{row.map(renderField)}</FieldGrid>
        ) : (
          renderField(row[0])
        )
      )}
      <SubmitButton label={entry ? undefined : t(`${block}.add`)} />
      <FormMessage state={state} />
    </form>
  );
}

export function EntriesSection({ block, entries }: { block: EntryBlock; entries: EntryItem[] }) {
  const t = useTranslations("Profile.entries");
  const tConfirm = useTranslations("Confirm");

  return (
    <div className="flex flex-col gap-3">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t(`${block}.empty`)}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-xl bg-muted/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <h3 className="font-medium">{entry.heading}</h3>
                  {entry.subheading && <p className="text-sm text-muted-foreground">{entry.subheading}</p>}
                  {entry.period && <p className="text-sm text-muted-foreground">{entry.period}</p>}
                </div>
                <form action={deleteEntry}>
                  <input type="hidden" name="block" value={block} />
                  <input type="hidden" name="id" value={entry.id} />
                  <ConfirmButton variant="ghost" size="icon-sm" ariaLabel={t("deleteItem", { item: entry.heading })} title={tConfirm("deleteEntry.title", { item: entry.heading })} description={tConfirm("noUndo")} confirmLabel={tConfirm("delete")}>
                    <Trash2 aria-hidden="true" />
                  </ConfirmButton>
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
