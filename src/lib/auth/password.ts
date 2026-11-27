import { basicPasswordProblem, type PasswordProblem } from "@/lib/validation/auth";
import { COMMON_PASSWORDS } from "./common-passwords";

// Solo para el servidor: la lista pesa ~35 KB y no tiene sentido mandarla al navegador.
const COMMON = new Set(COMMON_PASSWORDS.split("\n").filter(Boolean));

// Palabras del contexto (ASVS V6.2.11): el nombre del sitio y "contraseña", con o sin números alrededor.
const CONTEXT_WORDS = new Set(["pistaklero", "contraseña", "contrasena", "password", "trabajo", "empleo"]);

const lettersOnly = (value: string) => value.toLowerCase().normalize("NFKC").replace(/[^\p{L}]/gu, "");

/** null si la contraseña sirve; si no, el motivo (se muestra con un mensaje claro). */
export function passwordProblem(password: string, email?: string): PasswordProblem | null {
  const basic = basicPasswordProblem(password, email);
  if (basic) return basic;

  if (COMMON.has(password.toLowerCase())) return "too_common";
  const letters = lettersOnly(password);
  if (CONTEXT_WORDS.has(letters)) return "too_common";

  // "ana.perez" con "AnaPerez2026": la parte de antes de la @ no puede ser la contraseña.
  const local = email ? lettersOnly(email.split("@")[0] ?? "") : "";
  if (local.length >= 4 && letters === local) return "same_as_email";
  return null;
}
