import type { z } from "zod";

/*
 * Estado común de los formularios con Server Actions (useActionState).
 * Los errores viajan como códigos y el cliente los traduce (namespace "Form.errors").
 */
export type FieldErrorCode = "required" | "too_short" | "too_long" | "invalid";
export type FieldError = { code: FieldErrorCode; limit?: number };
export type FormErrorCode = "unknown" | "limit_reached" | "not_found" | "duplicate";

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

    if (issue.code === "too_small" && issue.origin === "string") {
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

/** Valores de texto del formulario, para devolverlos si hay errores (React reinicia el form). */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return values;
}

/** Errores de Postgres lanzados por nuestras funciones (raise exception 'codigo'). */
export function dbErrorCode(error: { message?: string; code?: string } | null): FormErrorCode {
  if (error?.message === "limit_reached") return "limit_reached";
  if (error?.code === "23505") return "duplicate";
  return "unknown";
}
