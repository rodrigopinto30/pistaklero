import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/geo";
import { EMPLOYMENT_TYPES, SENIORITIES, WORK_MODES } from "./job";

type Params = Record<string, string | string[] | undefined>;

const list = <T extends string>(values: readonly T[], raw: string | string[] | undefined) =>
  (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((v): v is T => (values as readonly string[]).includes(v));

/**
 * Filtros de la búsqueda a partir de la URL. Lo que no es válido se ignora en silencio:
 * una URL vieja o mal escrita igual muestra resultados.
 */
export function parseSearchParams(params: Params) {
  const one = (key: string) => (Array.isArray(params[key]) ? params[key]?.[0] : params[key]) ?? "";
  const flag = (key: string) => one(key) === "1";
  const page = z.coerce.number().int().min(1).max(20).catch(1).parse(one("page") || "1");
  const country = (COUNTRY_CODES as readonly string[]).includes(one("country")) ? one("country") : "";
  const language = one("lang") === "es" || one("lang") === "en" ? one("lang") : "";

  return {
    q: one("q").trim().slice(0, 200),
    remote: flag("remote"),
    junior: flag("junior"),
    salary: flag("salary"),
    usd: flag("usd"),
    seniority: list(SENIORITIES, params.seniority),
    type: list(EMPLOYMENT_TYPES, params.type),
    mode: list(WORK_MODES, params.mode),
    country,
    language,
    page,
  };
}

export type SearchFilters = ReturnType<typeof parseSearchParams>;
export const PAGE_SIZE = 20;

/** Arma los argumentos de search_jobs combinando los filtros rápidos con los avanzados. */
export function toSearchArgs(filters: SearchFilters) {
  const modes = new Set(filters.mode);
  if (filters.remote) modes.add("remote");
  const seniorities = new Set(filters.seniority);
  if (filters.junior) ["trainee", "junior"].forEach((s) => seniorities.add(s as (typeof SENIORITIES)[number]));

  return {
    p_query: filters.q || undefined,
    p_work_modes: modes.size ? [...modes] : undefined,
    p_seniorities: seniorities.size ? [...seniorities] : undefined,
    p_employment_types: filters.type.length ? filters.type : undefined,
    p_currency: filters.usd ? ("USD" as const) : undefined,
    p_salary_visible: filters.salary,
    p_language: (filters.language || undefined) as "es" | "en" | undefined,
    p_country: filters.country || undefined,
    p_limit: PAGE_SIZE * filters.page,
    p_offset: 0,
  };
}

/** URL de la página siguiente, manteniendo los filtros. */
export function nextPageQuery(params: Params, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) query.append(key, v);
  }
  query.set("page", String(page + 1));
  return query.toString();
}
