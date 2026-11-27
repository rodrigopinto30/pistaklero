import { z } from "zod";

/** Nombre, segundo nombre (opcional) y apellido: cada uno en su campo, hasta 50 caracteres. */
export const personNameSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  middleName: z.string().trim().max(50),
  lastName: z.string().trim().min(1).max(50),
});

export type PersonName = z.infer<typeof personNameSchema>;

/** "Ana María Pérez" → { firstName: "Ana", lastName: "María Pérez" }: para precargar con el nombre de Google o GitHub. */
export function splitFullName(fullName: string | null | undefined): Omit<PersonName, "middleName"> {
  const [firstName = "", ...rest] = (fullName ?? "").trim().split(/\s+/);
  return { firstName: firstName.slice(0, 50), lastName: rest.join(" ").slice(0, 50) };
}
