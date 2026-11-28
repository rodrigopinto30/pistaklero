import type { z } from "zod";

/*
 * Estado común de los formularios con Server Actions (useActionState).
 * Los errores viajan como códigos y el cliente los traduce (namespace "Form.errors").
 */
// Además de los genéricos, códigos de reglas propias (superRefine con message = código).
const CUSTOM_CODES = [
  "required",
  "max_below_min",
  "range_too_wide",
  "options",
  "required_unless_remote",
  "end_before_start",
  "end_required",
  "invalid_url",
  "invalid_month",
  "amount_positive",
  "too_many_gifs",
] as const;
export type FieldErrorCode = "required" | "too_short" | "too_long" | "invalid" | (typeof CUSTOM_CODES)[number];
export type FieldError = { code: FieldErrorCode; limit?: number };
export type FormErrorCode =
  | "unknown"
  | "limit_reached"
  | "not_found"
  | "duplicate"
  | "company_exists"
  | "file_too_large"
  | "avatar_too_large"
  | "file_type"
  | "required_file"
  | "unverified_limit"
  | "expired";

export type FormState =
  | { status: "idle" }
  | { status: "success"; savedAt: number }
  | {
      status: "error";
      fieldErrors: Record<string, FieldError>;
      formError?: FormErrorCode;
      values: Record<string, string>;
    };

export const idleState: FormState = { status: "idle" };

export function successState(): FormState {
  return { status: "success", savedAt: Date.now() };
}

export function errorState(
  values: Record<string, string>,
  fieldErrors: Record<string, FieldError> = {},
  formError?: FormErrorCode
): FormState {
  return { status: "error", fieldErrors, formError, values };
}

/** Primer error de cada campo, como código traducible. */
export function zodFieldErrors(error: z.ZodError): Record<string, FieldError> {
  const result: Record<string, FieldError> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string" || result[field]) continue;

    // Un esquema puede pedir un mensaje propio con { error: "código" } (fechas, URLs, montos…).
    if ((CUSTOM_CODES as readonly string[]).includes(issue.message)) {
      result[field] = { code: issue.message as FieldErrorCode };
    } else if (issue.code === "too_small" && issue.origin === "string") {
      result[field] =
        Number(issue.minimum) <= 1 ? { code: "required" } : { code: "too_short", limit: Number(issue.minimum) };
    } else if (issue.code === "too_big" && (issue.origin === "string" || issue.origin === "array")) {
      result[field] = { code: "too_long", limit: Number(issue.maximum) };
    } else {
      result[field] = { code: "invalid" };
    }
  }
  return result;
}

/** Saltos de línea siempre como \n (el navegador envía los de un <textarea> como \r\n). */
export const normalizeNewlines = (value: string) => value.replace(/\r\n?/g, "\n");

/**
 * Valores de texto del formulario, para validarlos y para devolverlos si hay errores (React reinicia
 * el form). Los saltos de línea llegan normalizados: lo guardado es igual a lo que se ve.
 */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = normalizeNewlines(value);
  }
  return values;
}

/** Errores de Postgres lanzados por nuestras funciones (raise exception 'codigo'). */
export function dbErrorCode(error: { message?: string; code?: string } | null): FormErrorCode {
  if (error?.message === "limit_reached") return "limit_reached";
  if (error?.code === "23505") return "duplicate";
  return "unknown";
}
