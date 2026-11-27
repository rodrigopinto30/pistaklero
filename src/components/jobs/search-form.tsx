import { Search, SlidersHorizontal } from "lucide-react";
import Form from "next/form";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { countryOptions } from "@/lib/geo";
import { EMPLOYMENT_TYPES, SENIORITIES, WORK_MODES } from "@/lib/validation/job";
import type { SearchFilters } from "@/lib/validation/search";

// El checkbox está oculto visualmente (sr-only): el foco del teclado se muestra en el chip.
const chipClass =
  "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-input px-4 text-sm font-medium has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring";

/*
 * Formulario GET: cada búsqueda tiene su URL (se puede compartir) y funciona sin JavaScript.
 * Con JavaScript, <Form> navega sin recargar la página.
 */
export async function SearchForm({ filters, locale }: { filters: SearchFilters; locale: string }) {
  const t = await getTranslations("Search");
  const tj = await getTranslations("Jobs");
  const hasAdvanced = filters.seniority.length + filters.type.length + filters.mode.length > 0 || filters.country || filters.language;

  const checkboxes = <T extends string>(name: string, values: readonly T[], selected: T[], label: (v: T) => string) => (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <label key={value} className={chipClass}>
          <input type="checkbox" name={name} value={value} defaultChecked={selected.includes(value)} className="sr-only" />
          {label(value)}
        </label>
      ))}
    </div>
  );

  return (
    <Form action={`/${locale}`} role="search" aria-label={t("label")} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Label htmlFor="search-q" className="sr-only">
          {t("query")}
        </Label>
        <div className="relative flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input id="search-q" name="q" type="search" defaultValue={filters.q} placeholder={t("placeholder")} className="h-12 pl-10 text-base" />
        </div>
        <Button type="submit" size="lg" className="h-12">
          {t("submit")}
        </Button>
      </div>

      <fieldset>
        <legend className="sr-only">{t("quickFilters")}</legend>
        <div className="flex flex-wrap gap-2">
          {(["remote", "junior", "salary", "usd"] as const).map((key) => (
            <label key={key} className={chipClass}>
              <input type="checkbox" name={key} value="1" defaultChecked={filters[key]} className="sr-only" />
              {t(`chips.${key}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <details open={Boolean(hasAdvanced)} className="rounded-2xl border border-border bg-card p-4">
        <summary className="inline-flex min-h-10 cursor-pointer items-center gap-2 font-medium">
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          {t("moreFilters")}
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{tj("seniority")}</legend>
            {checkboxes("seniority", SENIORITIES, filters.seniority, (v) => tj(`seniorityOptions.${v}`))}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{tj("employmentType")}</legend>
            {checkboxes("type", EMPLOYMENT_TYPES, filters.type, (v) => tj(`employmentOptions.${v}`))}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{tj("workMode")}</legend>
            {checkboxes("mode", WORK_MODES, filters.mode, (v) => tj(`workModeOptions.${v}`))}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="search-country">{tj("country")}</Label>
              <NativeSelect id="search-country" name="country" defaultValue={filters.country}>
                <option value="">{t("any")}</option>
                {countryOptions(locale).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="search-lang">{tj("language")}</Label>
              <NativeSelect id="search-lang" name="lang" defaultValue={filters.language}>
                <option value="">{t("any")}</option>
                <option value="es" lang="es">Español</option>
                <option value="en" lang="en">English</option>
              </NativeSelect>
            </div>
          </div>
          <Button type="submit" variant="secondary" className="self-start">
            {t("apply")}
          </Button>
        </div>
      </details>
    </Form>
  );
}
