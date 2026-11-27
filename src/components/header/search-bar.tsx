"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import Form from "next/form";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { openCommandPalette } from "@/components/command-palette";
import { NativeSelect } from "@/components/ui/native-select";
import { EMPLOYMENT_TYPES, SENIORITIES, WORK_MODES } from "@/lib/validation/job";
import { parseSearchParams } from "@/lib/validation/search";
import { cn } from "@/lib/utils";
import { getPathname, Link, usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { SECTION_HREF, sectionOf } from "./sections";

type Option = { code: string; name: string };

const QUICK = ["remote", "junior", "salary", "usd"] as const;

// El checkbox queda oculto (sr-only): el foco del teclado se ve en el chip.
const chipClass =
  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-secondary px-4 text-sm font-medium transition-colors hover:bg-muted has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring";

/** URLSearchParams → objeto con listas, como los searchParams de una página. */
function toParams(searchParams: URLSearchParams) {
  const params: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    params[key] = values.length > 1 ? values : values[0]!;
  }
  return params;
}

/**
 * Buscador del encabezado (siempre visible). Busca en la sección actual: empleos, empresas o publicaciones.
 * - Es un formulario GET: cada búsqueda tiene su URL y funciona sin JavaScript.
 * - Los campos reflejan siempre la URL: al ir a otra página, el texto y los filtros se limpian.
 * - En empleos, los filtros se despliegan abajo y se aplican apenas se tocan.
 */
export function SearchBar({ countries }: { countries: Option[] }) {
  const t = useTranslations("Search");
  const tj = useTranslations("Jobs");
  const th = useTranslations("Header");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  // En Mac la leyenda dice ⌘ K; en el servidor (y en el resto), Ctrl K.
  const isMac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false
  );

  const section = sectionOf(pathname) ?? "jobs";
  // En la página de la sección (no en una oferta o una empresa puntual), la URL trae lo buscado.
  const onResults = pathname === SECTION_HREF[section];
  const filters = parseSearchParams(onResults ? toParams(searchParams) : {});
  const active =
    section === "jobs"
      ? QUICK.filter((k) => filters[k]).length + filters.seniority.length + filters.type.length + filters.mode.length + (filters.country ? 1 : 0) + (filters.language ? 1 : 0)
      : 0;

  // Los campos son no controlados (no se pierde el foco al filtrar) y se ponen al día con la URL.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    for (const element of Array.from(form.elements)) {
      if (element instanceof HTMLInputElement && element.type === "checkbox") {
        const values = searchParams.getAll(element.name);
        element.checked = onResults && values.includes(element.value);
      } else if (element instanceof HTMLInputElement && element.name === "q") {
        if (document.activeElement !== element) element.value = filters.q;
      } else if (element instanceof HTMLSelectElement) {
        element.value = onResults ? (searchParams.get(element.name) ?? "") : "";
      }
    }
  }, [searchParams, onResults, filters.q]);

  const applyNow = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => event.currentTarget.form?.requestSubmit();

  const group = <T extends string>(name: string, values: readonly T[], selected: readonly string[], label: (v: T) => string) => (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <label key={value} className={chipClass}>
          <input type="checkbox" name={name} value={value} defaultChecked={selected.includes(value)} onChange={applyNow} className="sr-only" />
          {label(value)}
        </label>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-2 pb-3">
      <Form
        ref={formRef}
        action={getPathname({ locale, href: SECTION_HREF[section] })}
        role="search"
        aria-label={t(`label.${section}`)}
        className="flex w-full max-w-3xl flex-col gap-2"
      >
        <div className="flex items-center gap-1 rounded-full bg-card p-1.5 pl-5 shadow-soft transition-shadow focus-within:shadow-soft-lg">
          <Search aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          <label htmlFor="header-q" className="sr-only">
            {t(`query.${section}`)}
          </label>
          <input
            id="header-q"
            name="q"
            type="search"
            autoComplete="off"
            maxLength={200}
            defaultValue={filters.q}
            placeholder={t(`placeholder.${section}`)}
            className="h-10 min-w-0 flex-1 bg-transparent px-2 text-base outline-none placeholder:text-muted-foreground md:text-sm"
          />
          {section === "jobs" && (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls={panelId}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors hover:bg-muted sm:px-4",
                (open || active > 0) && "bg-secondary"
              )}
            >
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">{t("filters")}</span>
              <span className="sr-only sm:hidden">{t("filters")}</span>
              {active > 0 && (
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {active}
                  <span className="sr-only"> {t("activeFilters", { count: active })}</span>
                </span>
              )}
            </button>
          )}
          <button
            type="submit"
            aria-label={t("submit")}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Search aria-hidden="true" className="size-5" />
          </button>
        </div>

        {section === "jobs" && (
          // Se despliega suave (grid 0fr → 1fr). Cerrado queda inerte: el teclado no entra, pero se envía igual.
          <div
            id={panelId}
            inert={!open}
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
              open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <div className="mt-1 flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-soft">
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm font-medium">{t("quickFilters")}</legend>
                  <div className="flex flex-wrap gap-2">
                    {QUICK.map((key) => (
                      <label key={key} className={chipClass}>
                        <input type="checkbox" name={key} value="1" defaultChecked={filters[key]} onChange={applyNow} className="sr-only" />
                        {t(`chips.${key}`)}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm font-medium">{tj("seniority")}</legend>
                  {group("seniority", SENIORITIES, filters.seniority, (v) => tj(`seniorityOptions.${v}`))}
                </fieldset>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm font-medium">{tj("employmentType")}</legend>
                  {group("type", EMPLOYMENT_TYPES, filters.type, (v) => tj(`employmentOptions.${v}`))}
                </fieldset>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm font-medium">{tj("workMode")}</legend>
                  {group("mode", WORK_MODES, filters.mode, (v) => tj(`workModeOptions.${v}`))}
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="header-country" className="text-sm font-medium">
                      {tj("country")}
                    </label>
                    <NativeSelect id="header-country" name="country" defaultValue={filters.country} onChange={applyNow}>
                      <option value="">{t("any")}</option>
                      {countries.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="header-lang" className="text-sm font-medium">
                      {tj("language")}
                    </label>
                    <NativeSelect id="header-lang" name="lang" defaultValue={filters.language} onChange={applyNow}>
                      <option value="">{t("any")}</option>
                      <option value="es" lang="es">
                        Español
                      </option>
                      <option value="en" lang="en">
                        English
                      </option>
                    </NativeSelect>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {active > 0 ? (
                    <Link href={{ pathname: "/", query: filters.q ? { q: filters.q } : {} }} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
                      <X aria-hidden="true" className="size-4" />
                      {t("clearFilters")}
                    </Link>
                  ) : (
                    <span />
                  )}
                  {/* Con JavaScript los filtros se aplican al tocarlos; sin JavaScript, con este botón. */}
                  <button type="submit" className="inline-flex h-10 items-center rounded-full bg-secondary px-5 text-sm font-medium hover:bg-muted">
                    {t("apply")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Form>

      <p className="hidden text-xs text-muted-foreground sm:block">
        {th("shortcutBefore")}{" "}
        <button type="button" onClick={openCommandPalette} aria-keyshortcuts="Control+K Meta+K" className="inline-flex min-h-6 items-center rounded-md px-0.5 underline-offset-4 hover:text-foreground hover:underline">
          <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-sans text-[0.7rem] font-medium">{isMac ? "⌘" : "Ctrl"}</kbd>{" "}
          <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-sans text-[0.7rem] font-medium">K</kbd>
          <span className="sr-only"> ({th("shortcutAction")})</span>
        </button>{" "}
        {th("shortcutAfter")}
      </p>
    </div>
  );
}
