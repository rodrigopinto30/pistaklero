import { z } from "zod";

// Se usa igual en el formulario (cliente) y en las Server Actions (servidor).
export const emailSchema = z.email().max(254);

/** Código de 6 dígitos que llega por email (confirmar la cuenta o recuperar la contraseña). */
export const codeSchema = z.string().trim().regex(/^\d{6}$/);

/*
 * Contraseñas según OWASP ASVS 5.0 y NIST 800-63B: mínimo 8 caracteres, cualquier carácter (también
 * espacios y emojis), sin reglas de composición y sin vencimiento. El máximo lo pone bcrypt: 72 bytes.
 * Las más comunes se rechazan aparte, en el servidor (ver password.ts).
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export const PASSWORD_PROBLEMS = ["too_short", "too_long", "too_common", "same_as_email"] as const;
export type PasswordProblem = (typeof PASSWORD_PROBLEMS)[number];

export function basicPasswordProblem(password: string, email?: string): PasswordProblem | null {
  if ([...password].length < PASSWORD_MIN_LENGTH) return "too_short";
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return "too_long";
  if (email && password.trim().toLowerCase() === email.trim().toLowerCase()) return "same_as_email";
  return null;
}
