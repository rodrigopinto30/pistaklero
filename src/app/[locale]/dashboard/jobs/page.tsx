import { Pencil, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { BackLink } from "@/components/back-link";
import { Emoji } from "@/components/emoji";
import { FilterChips, queryWithout } from "@/components/filter-chips";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { requireRecruiterPage } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { isExpired, isRecent } from "@/lib/jobs/format";
import { Constants, type Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { getPathname, Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { JobStatTiles } from "./_components/job-stats";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MyJobs");
  return { title: t("metaTitle"), robots: { index: false } };
}

const PAGE_SIZE = 20;
const STATUSES = ["active", "expired", "draft", "closed", "hidden"] as const;
const SORTS = ["recent", "applications"] as const;
const MODES = Constants.public.Enums.work_mode;

type Row = Database["public"]["Functions"]["company_job_stats"]["Returns"][number];

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");
const pick = <T extends string>(value: string, options: readonly T[]) => (options.includes(value as T) ? (value as T) : undefined);

/**
 * "Mis ofertas": todas las ofertas de la empresa, una debajo de la otra, con buscador, filtros y
 * los números de cada una. La recién creada (?nueva=id) aparece resaltada, como en LinkedIn.
 */
export default async function MyJobsPage({ searchParams }: PageProps<"/[locale]/dashboard/jobs">) {
  const locale = (await getLocale()) as AppLocale;
  const { company } = await requireRecruiterPage(locale, "/dashboard/jobs");
  const user = await getCurrentUser();
  const t = await getTranslations("MyJobs");
  const tJobs = await getTranslations("Jobs");
  const tSearch = await getTranslations("Search");

  const params = await searchParams;
  const q = one(params.q).trim().slice(0, 200);
  const status = pick(one(params.status), STATUSES);
  const creator = z.uuid().safeParse(one(params.creator)).data;
  const mode = pick(one(params.mode), MODES);
  const sort = pick(one(params.sort), SORTS) ?? "recent";
  const page = Math.min(Math.max(Number(one(params.page)) || 1, 1), 10);
  const highlighted = z.uuid().safeParse(one(params.nueva)).data;

  const supabase = await createClient();
  const [{ data }, { data: members }] = await Promise.all([
    supabase.rpc("company_job_stats", {
      p_query: q || undefined,
      p_status: status,
      p_creator: creator,
      p_mode: mode,
      p_sort: sort,
      p_limit: Math.min(PAGE_SIZE * page, 50),
    }),
    supabase.rpc("list_company_members"),
  ]);
  const rows = data ?? [];
  const total = Number(rows[0]?.total_count ?? 0);
  const memberName = (id: string) => {
    const member = (members ?? []).find((m) => m.user_id === id);
    const name = member?.full_name || member?.email || "";
    return id === user?.id ? t("creatorMe", { name }) : name;
  };

  // Filtros activos como etiquetas (sin "nueva": el resaltado es solo para la vuelta de crearla).
  const filters = { ...(q ? { q } : {}), ...(status ? { status } : {}), ...(creator ? { creator } : {}), ...(mode ? { mode } : {}), ...(sort !== "recent" ? { sort } : {}) };
  const chipLabels: [keyof typeof filters, string | null][] = [
    ["q", q ? tSearch("chips.query", { q }) : null],
    ["status", status ? t(`statusOptions.${status}`) : null],
    ["creator", creator ? `${t("creator")}: ${memberName(creator)}` : null],
    ["mode", mode ? tJobs(`workModeOptions.${mode}`) : null],
    ["sort", sort !== "recent" ? t(`sortOptions.${sort}`) : null],
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <BackLink fallback="/dashboard" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("title")} <Emoji symbol="📋" />
          </h1>
          <p className="text-muted-foreground">{t("subtitle", { company: company.name })}</p>
        </div>
        <Link href="/dashboard/jobs/new" className={buttonVariants({ size: "lg" })}>
          <Plus aria-hidden="true" />
          {tJobs("list.new")}
        </Link>
      </div>

      {/* Un formulario GET: funciona sin JavaScript y la URL se puede compartir con el equipo. */}
      <form
        method="get"
        role="search"
        aria-label={t("filtersLabel")}
        action={getPathname({ locale, href: "/dashboard/jobs" })}
        className="grid gap-3 rounded-2xl bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-end"
      >
        <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="my-jobs-q">{t("search")}</Label>
          <Input id="my-jobs-q" name="q" type="search" defaultValue={q} maxLength={200} autoComplete="off" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="my-jobs-status">{t("status")}</Label>
          <NativeSelect id="my-jobs-status" name="status" defaultValue={status ?? ""}>
            <option value="">{t("statusAll")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`statusOptions.${s}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="my-jobs-creator">{t("creator")}</Label>
          <NativeSelect id="my-jobs-creator" name="creator" defaultValue={creator ?? ""}>
            <option value="">{t("creatorAll")}</option>
            {(members ?? []).map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {memberName(m.user_id)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="my-jobs-mode">{t("mode")}</Label>
          <NativeSelect id="my-jobs-mode" name="mode" defaultValue={mode ?? ""}>
            <option value="">{t("modeAll")}</option>
            {MODES.map((m) => (
              <option key={m} value={m}>
                {tJobs(`workModeOptions.${m}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="my-jobs-sort">{t("sort")}</Label>
          <NativeSelect id="my-jobs-sort" name="sort" defaultValue={sort}>
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`sortOptions.${s}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <button type="submit" className={buttonVariants({ variant: "secondary" })}>
          {t("apply")}
        </button>
      </form>

      <FilterChips
        chips={chipLabels
          .filter((entry): entry is [keyof typeof filters, string] => entry[1] !== null)
          .map(([key, label]) => ({ key, label, href: { pathname: "/dashboard/jobs" as const, query: queryWithout(filters, key) } }))}
        clearHref="/dashboard/jobs"
      />

      <p role="status" className="text-sm text-muted-foreground">
        {t("count", { count: total })}
      </p>

      {rows.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id}>
              <MyJobRow row={row} highlighted={row.id === highlighted} locale={locale} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-card p-6 shadow-soft">
          <p>{Object.keys(filters).length > 0 ? t("emptyFiltered") : t("empty")}</p>
          {Object.keys(filters).length > 0 ? (
            <Link href="/dashboard/jobs" className={buttonVariants({ variant: "outline" })}>
              {tSearch("clearFilters")}
            </Link>
          ) : (
            <Link href="/dashboard/jobs/new" className={buttonVariants()}>
              <Plus aria-hidden="true" />
              {tJobs("list.new")}
            </Link>
          )}
        </div>
      )}

      {rows.length < total && page < 10 && rows.length < 50 && (
        <Link href={{ pathname: "/dashboard/jobs", query: { ...filters, page: String(page + 1) } }} className={buttonVariants({ variant: "outline", className: "self-center" })}>
          {t("more")}
        </Link>
      )}
    </div>
  );
}

/** Una oferta del listado: estado, puesto, datos clave, quién la publicó, sus números y accesos. */
async function MyJobRow({ row, highlighted, locale }: { row: Row; highlighted: boolean; locale: AppLocale }) {
  const t = await getTranslations("MyJobs");
  const tJobs = await getTranslations("Jobs");
  const format = await getFormatter();
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "medium" });
  const isNew = highlighted || isRecent(row.created_at);
  const params = { id: row.id };
  const details = [
    tJobs(`workModeOptions.${row.work_mode}`),
    tJobs(`seniorityOptions.${row.seniority}`),
    row.published_at ? t("dates.published", { date: date(row.published_at) }) : t("dates.created", { date: date(row.created_at) }),
    row.status === "published" && isExpired(row.valid_through) ? t("dates.expired", { date: date(row.valid_through) }) : t("dates.validThrough", { date: date(row.valid_through) }),
    row.creator_name ? t("createdBy", { name: row.creator_name }) : null,
  ].filter(Boolean);

  return (
    <article
      id={`oferta-${row.id}`}
      aria-labelledby={`my-job-${row.id}`}
      data-highlighted={highlighted || undefined}
      className={cn("flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-soft transition-shadow hover:shadow-soft-lg", highlighted && "bg-primary/5 ring-2 ring-primary")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <JobStatusBadge status={row.status} validThrough={row.valid_through} />
            {isNew && <span className="rounded-full bg-violet/10 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-violet uppercase">{t("newBadge")}</span>}
          </div>
          <h2 id={`my-job-${row.id}`} lang={locale} className="text-lg leading-snug font-semibold break-words">
            <Link href={{ pathname: "/dashboard/jobs/[id]", params }} className="underline-offset-4 hover:underline">
              {row.title}
            </Link>
          </h2>
          <p className="text-sm text-muted-foreground">{details.join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!row.external && (
            <Link href={{ pathname: "/dashboard/jobs/[id]/applicants", params }} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Users aria-hidden="true" />
              {t("actions.applicants")}
            </Link>
          )}
          <Link href={{ pathname: "/dashboard/jobs/[id]/edit", params }} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Pencil aria-hidden="true" />
            {t("actions.edit")}
          </Link>
        </div>
      </div>
      <JobStatTiles stats={row} compact />
    </article>
  );
}
