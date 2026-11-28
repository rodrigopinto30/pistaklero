import { getLocale, getTranslations } from "next-intl/server";
import { FilterChips, queryWithout } from "@/components/filter-chips";
import { countryName } from "@/lib/geo";
import type { SearchFilters } from "@/lib/validation/search";

type Params = Record<string, string | string[] | undefined>;

/** Los filtros de Empleos a la vista (el panel de filtros puede estar cerrado), con "Limpiar filtros". */
export async function ActiveFilters({ params, filters }: { params: Params; filters: SearchFilters }) {
  const t = await getTranslations("Search");
  const tj = await getTranslations("Jobs");
  const locale = await getLocale();
  const chips: { key: string; value?: string; label: string }[] = [
    ...(filters.q ? [{ key: "q", label: t("chips.query", { q: filters.q }) }] : []),
    ...(["remote", "junior", "salary", "usd"] as const).filter((k) => filters[k]).map((k) => ({ key: k, label: t(`chips.${k}`) })),
    ...filters.seniority.map((v) => ({ key: "seniority", value: v, label: tj(`seniorityOptions.${v}`) })),
    ...filters.type.map((v) => ({ key: "type", value: v, label: tj(`employmentOptions.${v}`) })),
    ...filters.mode.map((v) => ({ key: "mode", value: v, label: tj(`workModeOptions.${v}`) })),
    ...(filters.country ? [{ key: "country", label: countryName(filters.country, locale) ?? filters.country }] : []),
    ...(filters.language ? [{ key: "lang", label: filters.language === "es" ? "Español" : "English" }] : []),
  ];

  return (
    <FilterChips
      chips={chips.map((chip) => ({
        key: `${chip.key}-${chip.value ?? ""}`,
        label: chip.label,
        href: { pathname: "/", query: queryWithout(params, chip.key, chip.value) },
      }))}
      clearHref="/"
    />
  );
}
