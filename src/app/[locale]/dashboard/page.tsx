import { ArrowRight, CircleAlert, Plus } from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { SectionCard } from "@/components/section-card";
import { buttonVariants } from "@/components/ui/button";
import { requireRecruiterPage } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Emoji } from "@/components/emoji";
import { JobStatTiles } from "./jobs/_components/job-stats";
import { BackLink } from "@/components/back-link";

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
  const supabase = await createClient();
  // Las últimas tres ofertas con sus números; el resto, en "Mis ofertas".
  const { data: recent } = await supabase.rpc("company_job_stats", { p_limit: 3 });
  const jobs = recent ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <BackLink fallback="/" />
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
        <div className="flex flex-col gap-4">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("jobsEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {jobs.map((job) => (
                <li key={job.id} className="flex flex-col gap-2 rounded-xl bg-muted/60 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={{ pathname: "/dashboard/jobs/[id]", params: { id: job.id } }} className="font-medium underline-offset-4 hover:underline">
                      {job.title}
                    </Link>
                    <JobStatusBadge status={job.status} validThrough={job.valid_through} />
                  </div>
                  <JobStatTiles stats={job} compact />
                </li>
              ))}
            </ul>
          )}
          <Link href="/dashboard/jobs" className="inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-medium text-violet underline-offset-4 hover:underline">
            {t("seeAllJobs")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
