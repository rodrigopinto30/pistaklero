import { isIndustry } from "@/lib/validation/company";

type Translate = (key: string) => string;

/** Texto de la industria: la clave de la lista, traducida; lo escrito a mano ("Otra"), tal cual. */
export function industryLabel(value: string | null | undefined, t: Translate) {
  if (!value) return null;
  return isIndustry(value) ? t(value) : value;
}
