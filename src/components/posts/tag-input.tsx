"use client";

import { Hash, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_TAGS, normalizeTag } from "@/lib/posts/tags";

/**
 * Etiquetas como en dev.to: se escriben (con o sin #) y con Enter, coma o espacio quedan como chips.
 * Borrar con la tecla de retroceso, con el campo vacío, quita la última.
 */
export function TagInput({ name, initial = [] }: { name: string; initial?: string[] }) {
  const t = useTranslations("Posts.tags");
  const id = useId();
  const [tags, setTags] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);

  const add = (raw: string) => {
    const parts = raw.split(/[\s,]+/).filter(Boolean);
    const valid = parts.map(normalizeTag).filter((tag): tag is string => tag !== null);
    setTags((current) => [...current, ...valid.filter((tag, i) => !current.includes(tag) && valid.indexOf(tag) === i)].slice(0, MAX_TAGS));
    setInvalid(valid.length < parts.length);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === "," || event.key === " ") {
      event.preventDefault();
      if (draft.trim()) add(draft);
    } else if (event.key === "Backspace" && !draft && tags.length > 0) {
      setTags((current) => current.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {tags.map((tag) => (
        <input key={tag} type="hidden" name={name} value={tag} />
      ))}
      <Label htmlFor={id}>
        {t("label")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
      </Label>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-input bg-field p-2 focus-within:outline-2 focus-within:outline-ring">
        {tags.length > 0 && (
          <ul aria-label={t("chosen")} className="contents">
            {tags.map((tag) => (
              <li key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 py-0.5 pr-0.5 pl-2.5 text-sm font-medium text-primary">
                #{tag}
                <button
                  type="button"
                  aria-label={t("remove", { tag })}
                  onClick={() => setTags((current) => current.filter((c) => c !== tag))}
                  className="flex size-6 items-center justify-center rounded-full hover:bg-primary/15"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex min-w-40 flex-1 items-center gap-1">
          <Hash aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <Input
            id={id}
            value={draft}
            onChange={(event) => {
              // Al escribir o pegar "ia, python ux": lo que ya está separado queda como etiqueta.
              const value = event.target.value;
              const parts = value.split(/[\s,]+/);
              if (parts.length > 1) {
                add(parts.slice(0, -1).join(" "));
                setDraft(parts.at(-1) ?? "");
              } else setDraft(value);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => draft.trim() && add(draft)}
            maxLength={31}
            autoComplete="off"
            aria-describedby={`${id}-hint${invalid ? ` ${id}-error` : ""}`}
            aria-invalid={invalid || undefined}
            className="h-8 border-0 bg-transparent px-1 shadow-none focus-visible:outline-none"
          />
        </div>
      </div>
      <p id={`${id}-hint`} className="text-sm text-muted-foreground">
        {t("hint", { max: MAX_TAGS })}
      </p>
      {invalid && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {t("invalid")}
        </p>
      )}
    </div>
  );
}
