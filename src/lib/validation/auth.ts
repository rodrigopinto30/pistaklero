import { z } from "zod";

// Se usa igual en el formulario (cliente) y en las Server Actions (servidor).
export const emailSchema = z.email().max(254);

/** Código de 6 dígitos que llega por email (confirmar la cuenta o recuperar la contraseña). */
export const codeSchema = z.string().trim().regex(/^\d{6}$/);

/*
 * Contraseña fuerte: al menos 10 caracteres, con mayúscula, minúscula, número y símbolo.
 * Son las mismas reglas que Supabase aplica con "lower_upper_letters_digits_symbols" (letras A-Z y
 * a-z, dígitos 0-9 y los símbolos de abajo), así lo que el formulario tilda en verde nunca lo rechaza
 * el servidor. El máximo lo pone bcrypt: 72 bytes.
 */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};':\"|<>?,./`~\\";

export const PASSWORD_RULES = ["length", "upper", "lower", "digit", "symbol"] as const;
export type PasswordRule = (typeof PASSWORD_RULES)[number];

/** Qué reglas cumple la contraseña (para la lista que se va tildando mientras se escribe). */
export function passwordRuleChecks(password: string): Record<PasswordRule, boolean> {
  return {
    length: [...password].length >= PASSWORD_MIN_LENGTH,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    symbol: [...password].some((char) => PASSWORD_SYMBOLS.includes(char)),
  };
}

export const PASSWORD_PROBLEMS = [
  "too_short",
  "too_long",
  "needs_upper",
  "needs_lower",
  "needs_digit",
  "needs_symbol",
  "same_as_email",
  "mismatch",
] as const;
export type PasswordProblem = (typeof PASSWORD_PROBLEMS)[number];

const RULE_PROBLEM: Record<PasswordRule, PasswordProblem> = {
  length: "too_short",
  upper: "needs_upper",
  lower: "needs_lower",
  digit: "needs_digit",
  symbol: "needs_symbol",
};

const lettersOnly = (value: string) => value.toLowerCase().normalize("NFKC").replace(/[^\p{L}]/gu, "");

/** null si la contraseña sirve; si no, el primer motivo (se muestra con un mensaje claro). */
export function passwordProblem(password: string, email?: string): PasswordProblem | null {
  const checks = passwordRuleChecks(password);
  const failed = PASSWORD_RULES.find((rule) => !checks[rule]);
  if (failed) return RULE_PROBLEM[failed];
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return "too_long";

  if (email) {
    // Ni el email ni lo de antes de la @ ("ana.perez" con "AnaPerez-2026"), aunque cumpla las reglas.
    if (password.trim().toLowerCase() === email.trim().toLowerCase()) return "same_as_email";
    const local = lettersOnly(email.split("@")[0] ?? "");
    if (local.length >= 4 && lettersOnly(password) === local) return "same_as_email";
  }
  return null;
}
