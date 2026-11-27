import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { JobCard } from "@/components/jobs/job-card";
import { ActiveFilters } from "@/components/jobs/active-filters";
import { buttonVariants } from "@/components/ui/button";
import { getJobViewer } from "@/lib/jobs/viewer";
import { createClient } from "@/lib/supabase/server";
import { nextPageQuery, PAGE_SIZE, parseSearchParams, toSearchArgs } from "@/lib/validation/search";
import { Link } from "@/i18n/navigation";

export default async function Home({ searchParams }: PageProps<"/[locale]">) {
  // Los resultados (y "hace 2 días") dependen del momento del pedido.
  await connection();
  const params = await searchParams;
  const filters = parseSearchParams(params);
  const locale = await getLocale();
  const t = await getTranslations("Search");
  const tHeader = await getTranslations("Header");

  const supabase = await createClient();
  const { data: jobs, error } = await supabase.rpc("search_jobs", toSearchArgs(filters));
  if (error) console.error("La búsqueda falló", { code: error.code, message: error.message });
  const results = jobs ?? [];
  const total = Number(results[0]?.total_count ?? 0);
  const hasMore = total > results.length && filters.page < 20;

  // Sin resultados para una búsqueda: se sugieren las ofertas más recientes en vez de una página vacía.
  let suggestions: typeof results = [];
  if (!error && results.length === 0 && filters.q) {
    const { data } = await supabase.rpc("search_jobs", { p_limit: 6 });
    suggestions = data ?? [];
  }
  const viewer = await getJobViewer([...results, ...suggestions].map((job) => job.id));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      {/* El buscador y los filtros están en el encabezado: acá, directo a los empleos. */}
      <h1 className="sr-only">{tHeader("tabs.jobs")}</h1>
      <ActiveFilters params={params} filters={filters} />

      <section aria-labelledby="results-title" className="flex flex-col gap-4">
        <h2 id="results-title" className="sr-only">
          {t("results")}
        </h2>
        {/* Se anuncia el resultado de cada búsqueda (WCAG 4.1.3). */}
        <p role="status" className="text-sm text-muted-foreground">
          {t("count", { count: total })}
        </p>
        {results.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((job, index) => (
              <li key={job.id}>
                <JobCard job={job} locale={locale} index={index + 1} viewer={viewer} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-2xl bg-card shadow-soft p-6">
            <p>{t("empty")}</p>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              {t("clear")}
            </Link>
          </div>
        )}
        {suggestions.length > 0 && (
          <section aria-labelledby="suggestions-title" className="flex flex-col gap-4">
            <h2 id="suggestions-title" className="text-xl font-semibold tracking-tight">
              {t("suggestions")}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((job) => (
                <li key={job.id}>
                  <JobCard job={job} locale={locale} viewer={viewer} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {hasMore && (
          // Sin scroll infinito: un enlace alcanzable con teclado que lleva al primer resultado nuevo.
          <a href={`?${nextPageQuery(params, filters.page)}#resultado-${PAGE_SIZE * filters.page + 1}`} className={buttonVariants({ variant: "outline", className: "self-center" })}>
            {t("loadMore")}
          </a>
        )}
      </section>
    </div>
  );
}
