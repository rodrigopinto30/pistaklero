import { CircleAlert, Plus } from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { SectionCard } from "@/components/section-card";
import { buttonVariants } from "@/components/ui/button";
import { requireRecruiterPage } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Emoji } from "@/components/emoji";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function DashboardPage() {
  const locale = (await getLocale()) as AppLocale;
  const { company } = await requireRecruiterPage(locale, "/dashboard");
  const t = await getTranslations("Dashboard");
  const tJobs = await getTranslations("Jobs");
  const tCompany = await getTranslations("Company");
  const format = await getFormatter();
  const supabase = await createClient();
  const [{ data: jobs }, { data: counts }] = await Promise.all([
    supabase.from("jobs").select("id, title, status, published_at, valid_through").eq("company_id", company.id).order("created_at", { ascending: false }),
    supabase.rpc("my_job_application_counts"),
  ]);
  const countFor = (jobId: string, statuses: string[]) =>
    (counts ?? []).filter((c) => c.job_id === jobId && statuses.includes(c.status)).reduce((sum, c) => sum + Number(c.total), 0);
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "medium" });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title", { company: company.name })} <Emoji symbol="📊" /></h1>
        {company.verified_at ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-verified/10 px-3 py-1 text-sm font-medium text-verified">
            <VerifiedBadge />
            {t("verifiedBadge")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-warn/12 px-3 py-1 text-sm text-warn">
            <CircleAlert aria-hidden="true" className="size-4" />
            {t("unverifiedBadge")}
          </span>
        )}
      </div>
      {!company.setup_completed_at && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/10 p-4">
          <p className="text-sm">
            <Emoji symbol="✨" className="mr-1.5" />
            {tCompany("setup.pending")}
          </p>
          <Link href="/dashboard/company" className={buttonVariants({ size: "sm" })}>
            {tCompany("setup.pendingLink")}
          </Link>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/jobs/new" className={buttonVariants({ size: "lg" })}>
          <Plus aria-hidden="true" />
          {tJobs("list.new")}
          <Emoji symbol="📣" />
        </Link>
        <Link href="/dashboard/company" className={buttonVariants({ variant: "outline" })}>
          {t("editCompany")}
        </Link>
        <Link href={{ pathname: "/companies/[slug]", params: { slug: company.slug } }} className={buttonVariants({ variant: "outline" })}>
          {t("viewCompany")}
        </Link>
        <Link href="/dashboard/team" className={buttonVariants({ variant: "outline" })}>
          {t("team")}
        </Link>
      </div>
      <SectionCard id="jobs" title={t("jobsTitle")}>
        {(jobs ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("jobsEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {jobs!.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-3">
                <span className="flex flex-col gap-1">
                  <Link href={{ pathname: "/dashboard/jobs/[id]", params: { id: job.id } }} className="font-medium underline-offset-4 hover:underline">
                    {job.title}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {job.published_at ? tJobs("list.published", { date: date(job.published_at) }) : tJobs("list.draft")} ·{" "}
                    {tJobs("list.validThrough", { date: date(job.valid_through) })}
                  </span>
                  <Link
                    href={{ pathname: "/dashboard/jobs/[id]/applicants", params: { id: job.id } }}
                    className="inline-flex min-h-6 items-center text-sm text-violet underline-offset-4 hover:underline"
                  >
                    {tJobs("list.applicants", {
                      pending: countFor(job.id, ["received"]),
                      total: countFor(job.id, ["received", "in_review", "interview", "hired", "rejected", "no_response", "withdrawn"]),
                    })}
                  </Link>
                </span>
                <JobStatusBadge status={job.status} validThrough={job.valid_through} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
