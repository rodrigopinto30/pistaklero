import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { SectionCard } from "@/components/section-card";
import { requireRecruiterPage } from "@/lib/auth/guards";
import { isExpired } from "@/lib/jobs/format";
import { createClient } from "@/lib/supabase/server";
import type { AppLocale } from "@/i18n/routing";
import { DailyBars } from "../_components/daily-bars";
import { JobManageHeader } from "../_components/job-manage-header";
import { JobStatTiles, STAGE_ORDER, stageCounts } from "../_components/job-stats";
import { StatusControls } from "../_components/status-controls";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MyJobs.summary");
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Resumen de una oferta: sus números, los postulantes por etapa y cómo le fue día a día. */
export default async function JobSummaryPage({ params }: PageProps<"/[locale]/dashboard/jobs/[id]">) {
  const { id } = await params;
  const locale = (await getLocale()) as AppLocale;
  const { company } = await requireRecruiterPage(locale, { pathname: "/dashboard/jobs/[id]", params: { id } });
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("id, title, slug, status, source, valid_through, published_at, created_at").eq("id", id).eq("company_id", company.id).maybeSingle();
  if (!job) notFound();
  const [{ data: rows }, { data: daily }] = await Promise.all([supabase.rpc("company_job_stats", { p_job_id: id, p_limit: 1 }), supabase.rpc("company_job_daily", { p_job_id: id, p_days: 30 })]);
  const stats = rows?.[0];
  if (!stats) notFound();

  const t = await getTranslations("MyJobs");
  const tStatus = await getTranslations("Applications.status");
  const format = await getFormatter();
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "medium" });
  const short = (day: string) => format.dateTime(new Date(`${day}T12:00:00Z`), { day: "numeric", month: "short" });
  const counts = stageCounts(stats.by_status);
  const funnelMax = Math.max(1, ...STAGE_ORDER.map((s) => counts[s]));
  const views = Number(stats.views);
  const rate = views > 0 ? Math.round((Number(stats.applications) / views) * 100) : null;
  const points = (daily ?? []).map((d) => ({ day: d.day, label: short(d.day), views: d.views, applications: d.applications }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <JobManageHeader job={job} current="summary" />

      <p className="text-sm text-muted-foreground">
        {[
          stats.creator_name ? t("summary.createdBy", { name: stats.creator_name }) : null,
          job.published_at ? t("dates.published", { date: date(job.published_at) }) : t("dates.created", { date: date(job.created_at) }),
          isExpired(job.valid_through) ? t("dates.expired", { date: date(job.valid_through) }) : t("dates.validThrough", { date: date(job.valid_through) }),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <StatusControls jobId={job.id} status={job.status} locale={locale} canDuplicate={job.source === "native"} />

      <section aria-labelledby="numbers-title" className="flex flex-col gap-3">
        <h2 id="numbers-title" className="text-lg font-semibold">
          {t("summary.numbers")}
        </h2>
        <JobStatTiles stats={stats} />
        {stats.external ? (
          <p className="text-sm text-muted-foreground">{t("summary.external")}</p>
        ) : (
          rate !== null && <p className="text-sm text-muted-foreground">{t("summary.conversion", { rate })}</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard id="funnel" title={t("summary.funnel")}>
          {Number(stats.applications) === 0 ? (
            <p className="text-sm text-muted-foreground">{t("summary.funnelEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {STAGE_ORDER.map((stage) => (
                <li key={stage} className="flex flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{tStatus(stage)}</span>
                    <span className="font-medium tabular-nums">{counts[stage]}</span>
                  </span>
                  <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${(counts[stage] / funnelMax) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard id="daily" title={t("summary.daily")} description={t("summary.dailyHint")}>
          <div className="flex flex-col gap-6">
            <DailyBars title={t("summary.dailyViews")} points={points.map((p) => ({ day: p.day, label: p.label, value: p.views }))} unit="views" />
            <DailyBars title={t("summary.dailyApplications")} points={points.map((p) => ({ day: p.day, label: p.label, value: p.applications }))} unit="applications" />
            <details className="text-sm">
              <summary className="inline-flex min-h-10 cursor-pointer items-center font-medium text-violet underline-offset-4 hover:underline">{t("summary.dailyTable")}</summary>
              {/* Con scroll propio: se puede enfocar para recorrerla con el teclado (WCAG 2.1.1). */}
              <div tabIndex={0} role="region" aria-label={t("summary.dailyTable")} className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-border">
                <table className="w-full text-left tabular-nums">
                  <thead className="sticky top-0 bg-card">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">{t("summary.day")}</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">{t("summary.dailyViews")}</th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">{t("summary.dailyApplications")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...points].reverse().map((p) => (
                      <tr key={p.day} className="border-t border-border">
                        <th scope="row" className="px-3 py-1.5 font-normal">{p.label}</th>
                        <td className="px-3 py-1.5 text-right">{p.views}</td>
                        <td className="px-3 py-1.5 text-right">{p.applications}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
