import { BadgeCheck, Building2, ExternalLink, Laptop, MapPin, Signal } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { countryName } from "@/lib/geo";
import { formatSalaryRange } from "@/lib/jobs/format";
import { timeAgo } from "@/lib/jobs/time";
import { companyLogoUrl } from "@/lib/storage";
import type { Database } from "@/lib/supabase/database.types";
import { Link } from "@/i18n/navigation";
import { ResponseBadge } from "./response-badge";

export type JobCardData = Database["public"]["Functions"]["search_jobs"]["Returns"][number];

/** Tarjeta uniforme, escaneable en 3 segundos: puesto, empresa, sueldo, modalidad y antigüedad. */
export async function JobCard({ job, locale, index }: { job: JobCardData; locale: string; index: number }) {
  const t = await getTranslations("Jobs");
  const salary = formatSalaryRange(job, locale);
  const logo = companyLogoUrl(job.company_logo_path);
  const skills = (job.skills as { es: string; en: string }[]).map((s) => (locale === "en" ? s.en : s.es));
  const location = job.work_mode === "remote" ? null : [job.city, countryName(job.country, locale)].filter(Boolean).join(", ");

  return (
    <article id={`resultado-${index}`} aria-labelledby={`job-${job.id}`} className="relative flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-input">
      <div className="flex items-center gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- WebP de 256 px ya optimizado, desde nuestro Storage.
          <img src={logo} alt="" width={40} height={40} className="size-10 rounded-lg border border-border bg-muted object-contain" />
        ) : (
          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Building2 className="size-5 text-muted-foreground" />
          </span>
        )}
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          {job.company_name}
          {job.company_verified && <BadgeCheck aria-hidden="true" className="size-4 text-primary" />}
        </span>
        {job.source === "imported" && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-input px-2 py-0.5 text-xs text-muted-foreground">
            <ExternalLink aria-hidden="true" className="size-3" />
            {t("detail.external")}
          </span>
        )}
      </div>
      <h3 id={`job-${job.id}`} lang={job.language} className="text-lg leading-snug font-semibold">
        {/* El enlace cubre toda la tarjeta con ::after, pero su nombre accesible es solo el puesto. */}
        <Link href={{ pathname: "/jobs/[slug]", params: { slug: job.slug } }} className="after:absolute after:inset-0 after:rounded-2xl">
          {job.title}
        </Link>
      </h3>
      <p className={salary ? "font-semibold text-primary" : "text-sm text-muted-foreground"}>
        {salary ? `${salary} · ${t(`periodShort.${job.salary_period!}`)}` : t("detail.salaryNotInformed")}
      </p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <li className="inline-flex items-center gap-1">
          <Laptop aria-hidden="true" className="size-4" />
          {t(`workModeOptions.${job.work_mode}`)}
        </li>
        <li className="inline-flex items-center gap-1">
          <Signal aria-hidden="true" className="size-4" />
          {t(`seniorityOptions.${job.seniority}`)}
        </li>
        {location && (
          <li className="inline-flex items-center gap-1">
            <MapPin aria-hidden="true" className="size-4" />
            {location}
          </li>
        )}
      </ul>
      {skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={t("detail.skills")}>
          {skills.map((skill) => (
            <li key={skill} className="rounded-full border border-input px-2.5 py-0.5 text-xs">
              {skill}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        {job.published_at && (
          <p className="text-xs text-muted-foreground">
            <time dateTime={job.published_at}>{timeAgo(job.published_at, locale)}</time>
          </p>
        )}
        {job.source === "native" && <ResponseBadge badge={job.company_badge} />}
      </div>
    </article>
  );
}
