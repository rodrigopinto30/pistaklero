import { X } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { countryName } from "@/lib/geo";
import type { SearchFilters } from "@/lib/validation/search";
import { Link } from "@/i18n/navigation";

type Params = Record<string, string | string[] | undefined>;

/** La misma búsqueda sin un filtro (o sin uno de los valores de una lista). */
function without(params: Params, key: string, value?: string) {
  const query: Record<string, string | string[]> = {};
  for (const [k, raw] of Object.entries(params)) {
    if (raw === undefined || k === "page") continue;
    const values = (Array.isArray(raw) ? raw : [raw]).filter((v) => !(k === key && (value === undefined || v === value)));
    if (values.length) query[k] = values.length === 1 ? values[0]! : values;
  }
  return query;
}

/** Los filtros aplicados, a la vista y cada uno con su ✕ para sacarlo (el panel de filtros puede estar cerrado). */
export async function ActiveFilters({ params, filters }: { params: Params; filters: SearchFilters }) {
  const t = await getTranslations("Search");
  const tj = await getTranslations("Jobs");
  const locale = await getLocale();
  const chips: { key: string; value?: string; label: string }[] = [
    ...(["remote", "junior", "salary", "usd"] as const).filter((k) => filters[k]).map((k) => ({ key: k, label: t(`chips.${k}`) })),
    ...filters.seniority.map((v) => ({ key: "seniority", value: v, label: tj(`seniorityOptions.${v}`) })),
    ...filters.type.map((v) => ({ key: "type", value: v, label: tj(`employmentOptions.${v}`) })),
    ...filters.mode.map((v) => ({ key: "mode", value: v, label: tj(`workModeOptions.${v}`) })),
    ...(filters.country ? [{ key: "country", label: countryName(filters.country, locale) ?? filters.country }] : []),
    ...(filters.language ? [{ key: "lang", label: filters.language === "es" ? "Español" : "English" }] : []),
  ];
  if (chips.length === 0) return null;

  return (
    <nav aria-label={t("activeFiltersLabel")} className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Link
          key={`${chip.key}-${chip.value ?? ""}`}
          href={{ pathname: "/", query: without(params, chip.key, chip.value) }}
          aria-label={t("removeFilter", { filter: chip.label })}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3.5 text-sm font-medium text-primary hover:bg-primary/15"
        >
          {chip.label}
          <X aria-hidden="true" className="size-4" />
        </Link>
      ))}
    </nav>
  );
}
