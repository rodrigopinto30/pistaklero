import { FilterX, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

type Href = ComponentProps<typeof Link>["href"];
export type FilterChip = { key: string; label: string; href: Href };

/**
 * Los filtros aplicados a la vista (también lo buscado), cada uno con su ✕ para sacarlo, y
 * "Limpiar filtros" para volver al listado completo. Son enlaces: funcionan sin JavaScript.
 */
export async function FilterChips({ chips, clearHref }: { chips: FilterChip[]; clearHref: Href }) {
  if (chips.length === 0) return null;
  const t = await getTranslations("Search");

  return (
    <nav aria-label={t("activeFiltersLabel")} className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          aria-label={t("removeFilter", { filter: chip.label })}
          className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-3.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
        >
          <span className="truncate">{chip.label}</span>
          <X aria-hidden="true" className="size-4 shrink-0" />
        </Link>
      ))}
      <Link
        href={clearHref}
        data-clear-filters
        className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <FilterX aria-hidden="true" className="size-4" />
        {t("clearFilters")}
      </Link>
    </nav>
  );
}

/** La misma búsqueda sin un filtro (o sin uno de los valores de una lista) y sin la página. */
export function queryWithout(params: Record<string, string | string[] | undefined>, key: string, value?: string) {
  const query: Record<string, string | string[]> = {};
  for (const [k, raw] of Object.entries(params)) {
    if (raw === undefined || k === "page") continue;
    const values = (Array.isArray(raw) ? raw : [raw]).filter((v) => v !== "" && !(k === key && (value === undefined || v === value)));
    if (values.length) query[k] = values.length === 1 ? values[0]! : values;
  }
  return query;
}
