"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef } from "react";
import { notify } from "@/components/toaster";
import { Label } from "@/components/ui/label";
import type { FieldError, FormState } from "@/lib/forms";

type ControlProps = {
  id: string;
  name: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
};

/**
 * Etiqueta + control + ayuda + error, asociados con aria-describedby (WCAG 1.3.1 y 3.3.1).
 * El control se pasa como función para recibir los atributos de accesibilidad.
 */
export function Field({
  id,
  name,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: FieldError;
  children: (props: ControlProps) => ReactNode;
}) {
  const t = useTranslations("Form");
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}{" "}
        <span className="font-normal text-muted-foreground">{required ? t("required") : t("optional")}</span>
      </Label>
      {children({
        id,
        name,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": [errorId, hintId].filter(Boolean).join(" ") || undefined,
      })}
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {t(`errors.${error.code}`, { limit: error.limit ?? 0 })}
        </p>
      )}
    </div>
  );
}

/**
 * Resultado del formulario. Lo guardado se avisa con un toast (chico, no invasivo y anunciado por
 * los lectores de pantalla); los errores quedan junto al formulario, que es donde hay que corregirlos.
 */
/** Textos de aviso para lo guardado (namespace "Toasts"). */
export type SuccessKey = "saved" | "invited" | "skillAdded" | "techAdded" | "logoUpdated" | "photoUpdated" | "statusUpdated" | "jobStatusUpdated" | "jobSaved" | "published";

export function FormMessage({ state, success = "saved" }: { state: FormState; success?: SuccessKey }) {
  const t = useTranslations("Form");
  const tToast = useTranslations("Toasts");
  const savedAt = state.status === "success" ? state.savedAt : null;
  const message = tToast(success);

  useEffect(() => {
    if (savedAt) notify(message);
    // Un aviso por cada guardado (savedAt cambia en cada uno).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAt]);

  return (
    <p role="status" className="text-sm empty:hidden">
      {/* Sin JavaScript no hay toasts: el aviso queda escrito acá. */}
      {state.status === "success" && (
        <noscript>
          <span className="text-primary">{message}</span>
        </noscript>
      )}
      {state.status === "error" && state.formError && (
        <span className="text-destructive">{t(`errors.${state.formError}`)}</span>
      )}
      {state.status === "error" && !state.formError && (
        <span className="text-destructive">{t("errors.fix_fields")}</span>
      )}
    </p>
  );
}

/** Después de un error, el foco va al primer campo inválido. */
export function useFocusFirstError(state: FormState) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status !== "error") return;
    formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);
  return formRef;
}

/** Valor a mostrar: el que mandó el usuario si hubo error, si no el guardado. */
export function valueOf(state: FormState, name: string, saved: string | null | undefined) {
  return state.status === "error" ? (state.values[name] ?? "") : (saved ?? "");
}
