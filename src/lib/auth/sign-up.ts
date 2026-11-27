/** Lo que se elige en el primer paso del registro. Viaja en la URL hasta la bienvenida (?role=…). */
export const SIGN_UP_ROLES = ["candidate", "recruiter"] as const;
export type SignUpRole = (typeof SIGN_UP_ROLES)[number];

export function parseSignUpRole(value: unknown): SignUpRole | null {
  return SIGN_UP_ROLES.find((role) => role === value) ?? null;
}
