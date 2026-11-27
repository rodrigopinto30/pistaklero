import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { requireRecruiterPage } from "@/lib/auth/guards";
import { daysUntil } from "@/lib/jobs/format";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { loadJobFormOptions } from "../_components/form-data";
import { JobForm } from "../_components/job-form";
import { StatusControls } from "../_components/status-controls";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Jobs");
  return { title: t("metaEdit"), robots: { index: false } };
}

export default async function EditJobPage({ params }: PageProps<"/[locale]/dashboard/jobs/[id]">) {
  const { id } = await params;
  const locale = (await getLocale()) as AppLocale;
  const { company } = await requireRecruiterPage(locale, { pathname: "/dashboard/jobs/[id]", params: { id } });
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", id).eq("company_id", company.id).maybeSingle();
  if (!job) notFound();

  const [{ data: skills }, { data: questions }, options, t] = await Promise.all([
    supabase.from("job_skills").select("skill_id").eq("job_id", id),
    supabase.from("job_questions").select("*").eq("job_id", id).order("position"),
    loadJobFormOptions(locale),
    getTranslations("Jobs"),
  ]);
  const question = (n: 1 | 2) => questions?.find((q) => q.position === n);
  const days = daysUntil(job.valid_through);
  const validDays = ["15", "30", "60", "90"].find((d) => Number(d) >= days) ?? "90";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{t("editTitle")}</h1>
          <JobStatusBadge status={job.status} validThrough={job.valid_through} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={{ pathname: "/dashboard/jobs/[id]/applicants", params: { id: job.id } }} className={buttonVariants()}>
            {t("viewApplicants")}
          </Link>
          {job.status === "published" && (
            <Link href={{ pathname: "/jobs/[slug]", params: { slug: job.slug } }} className={buttonVariants({ variant: "outline" })}>
              {t("viewPublic")}
            </Link>
          )}
        </div>
      </div>
      <StatusControls jobId={job.id} status={job.status} locale={locale} />
      <JobForm
        locale={locale}
        jobId={job.id}
        mode={job.status === "draft" ? "draft" : "live"}
        countries={options.countries}
        skillGroups={options.skillGroups}
        saved={{
          title: job.title,
          description: job.description,
          language: job.language,
          seniority: job.seniority,
          employmentType: job.employment_type,
          workMode: job.work_mode,
          country: job.country ?? "",
          city: job.city ?? "",
          salaryMin: String(job.salary_min ?? ""),
          salaryMax: String(job.salary_max ?? ""),
          salaryCurrency: job.salary_currency ?? "USD",
          salaryPeriod: job.salary_period ?? "month",
          salaryBasis: job.salary_basis ?? "gross",
          validDays,
          skills: (skills ?? []).map((s) => s.skill_id).join(","),
          question1Type: question(1)?.type ?? "none",
          question1Prompt: question(1)?.prompt ?? "",
          question1Options: (question(1)?.options ?? []).join("\n"),
          question2Type: question(2)?.type ?? "none",
          question2Prompt: question(2)?.prompt ?? "",
          question2Options: (question(2)?.options ?? []).join("\n"),
        }}
      />
    </div>
  );
}
