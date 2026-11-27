import { BadgeCheck, Briefcase, CalendarClock, ExternalLink, Laptop, MapPin, Signal } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Markdown } from "@/components/markdown";
import { buttonVariants } from "@/components/ui/button";
import { countryName } from "@/lib/geo";
import { formatSalaryRange, isExpired } from "@/lib/jobs/format";
import { companyLogoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { ApplyPanel } from "./apply-panel";

async function loadJob(slug: string) {
  const supabase = await createClient();
  // RLS: el público solo ve ofertas publicadas y vigentes (la empresa ve también las suyas).
  const { data } = await supabase
    .from("jobs")
    .select("*, companies(id, name, slug, logo_path, verified_at)")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/jobs/[slug]">): Promise<Metadata> {
  const job = await loadJob((await params).slug);
  if (!job) return {};
  const t = await getTranslations("Jobs");
  return {
    title: `${job.title} · ${job.companies?.name ?? ""}`,
    description: (job.summary || job.description).slice(0, 160),
    // Las importadas no se indexan al principio (contenido de terceros).
    robots: { index: job.source === "native" && job.status === "published", follow: true },
    other: { "job:seniority": t(`seniorityOptions.${job.seniority}`) },
  };
}

export default async function JobPage({ params }: PageProps<"/[locale]/jobs/[slug]">) {
  const job = await loadJob((await params).slug);
  if (!job) notFound();

  const locale = await getLocale();
  const t = await getTranslations("Jobs");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: skills } = await supabase.from("job_skills").select("skills(name_es, name_en)").eq("job_id", job.id);

  const company = job.companies;
  const logo = companyLogoUrl(company?.logo_path ?? null);
  const salary = formatSalaryRange(job, locale);
  const location = job.work_mode === "remote" ? null : [job.city, countryName(job.country, locale)].filter(Boolean).join(", ");
  const isOpen = job.status === "published" && !isExpired(job.valid_through);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-8 lg:grid-cols-3">
      <article className="flex flex-col gap-6 lg:col-span-2" aria-labelledby="job-title">
        <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- WebP de 256 px ya optimizado, desde nuestro Storage.
              <img src={logo} alt="" width={48} height={48} className="size-12 rounded-xl border border-border bg-muted object-contain" />
            ) : null}
            {company && (
              <Link href={{ pathname: "/companies/[slug]", params: { slug: company.slug } }} className="inline-flex items-center gap-1 font-medium text-violet underline-offset-4 hover:underline">
                {company.name}
                {company.verified_at && <BadgeCheck aria-label="✓" className="size-4 text-primary" />}
              </Link>
            )}
          </div>
          <h1 id="job-title" lang={job.language} className="text-3xl font-semibold tracking-tight">
            {job.title}
          </h1>
          <p className="text-2xl font-semibold text-primary">
            {salary ? (
              <>
                {salary}{" "}
                <span className="text-base font-normal text-muted-foreground">
                  {job.salary_currency} · {t(`periodShort.${job.salary_period!}`)} · {t(`basisShort.${job.salary_basis!}`)}
                </span>
              </>
            ) : (
              <span className="text-base font-normal text-muted-foreground">{t("detail.salaryNotInformed")}</span>
            )}
          </p>
          <ul className="flex flex-wrap gap-2 text-sm">
            <li className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1">
              <Laptop aria-hidden="true" className="size-4 text-violet" />
              {t(`workModeOptions.${job.work_mode}`)}
            </li>
            <li className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1">
              <Signal aria-hidden="true" className="size-4 text-violet" />
              {t(`seniorityOptions.${job.seniority}`)}
            </li>
            <li className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1">
              <Briefcase aria-hidden="true" className="size-4 text-violet" />
              {t(`employmentOptions.${job.employment_type}`)}
            </li>
            {location && (
              <li className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1">
                <MapPin aria-hidden="true" className="size-4 text-violet" />
                {location}
              </li>
            )}
          </ul>
        </header>

        <section aria-labelledby="job-about" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6">
          <h2 id="job-about" className="text-lg font-semibold">
            {t("detail.about")}
          </h2>
          <Markdown lang={job.language}>{job.source === "imported" ? job.summary : job.description}</Markdown>
        </section>
      </article>

      <aside className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-4">
          {!isOpen ? (
            <p className="text-sm text-muted-foreground">{t("detail.closed")}</p>
          ) : job.source === "imported" && job.external_url ? (
            <a href={job.external_url} rel="noopener noreferrer nofollow" target="_blank" className={buttonVariants({ size: "lg" })}>
              {t("detail.applyExternal")}
              <ExternalLink aria-hidden="true" />
            </a>
          ) : (
            <ApplyPanel jobId={job.id} slug={job.slug} />
          )}
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock aria-hidden="true" className="size-4" />
            {job.published_at && t("detail.postedOn", { date: format.dateTime(new Date(job.published_at), { dateStyle: "medium" }) })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("detail.validThrough", { date: format.dateTime(new Date(job.valid_through), { dateStyle: "medium" }) })}
          </p>
        </div>
        {(skills ?? []).length > 0 && (
          <section aria-labelledby="job-skills" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
            <h2 id="job-skills" className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {t("detail.skills")}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {skills!.map((s, i) => (
                <li key={i} className="rounded-full border border-input px-3 py-1 text-sm">
                  {(locale === "en" ? s.skills?.name_en : s.skills?.name_es) ?? ""}
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
