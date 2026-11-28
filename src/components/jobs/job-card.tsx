import { Building2, ExternalLink, Laptop, MapPin, Signal } from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";
import { getTranslations } from "next-intl/server";
import { countryName } from "@/lib/geo";
import { formatSalaryRange } from "@/lib/jobs/format";
import { timeAgo } from "@/lib/jobs/time";
import { companyLogoUrl } from "@/lib/storage";
import type { Database } from "@/lib/supabase/database.types";
import { Bookmark } from "lucide-react";
import { getPathname, Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { GuestAction } from "@/components/pending/guest-action";
import { ExternalApplyLink } from "./external-apply-link";
import type { JobViewer } from "@/lib/jobs/viewer";
import { buttonVariants } from "@/components/ui/button";
import { QuickApplyButton } from "./quick-apply-button";
import { SaveJobButton } from "./save-job-button";
import { ResponseBadge } from "./response-badge";

export type JobCardData = Database["public"]["Functions"]["search_jobs"]["Returns"][number];

/** Tarjeta uniforme, escaneable en 3 segundos: puesto, empresa, sueldo, modalidad y antigüedad. */
/**
 * Guardar (arriba, a la derecha) y postularse (abajo), según quién mira.
 * Van por encima del enlace que cubre la tarjeta (z-10): un clic en ellos no abre la oferta.
 */
async function JobCardAction({ part, job, locale, viewer }: { part: "save" | "apply"; job: JobCardData; locale: string; viewer: JobViewer }) {
  const t = await getTranslations("Jobs.actions");
  const tApply = await getTranslations("Apply");
  const jobHref = { pathname: "/jobs/[slug]" as const, params: { slug: job.slug } };
  const applyLink = (href: Parameters<typeof Link>[0]["href"]) => (
    <Link href={href} aria-label={t("applyTo", { title: job.title })} className={buttonVariants({ className: "relative z-10 w-full rounded-full" })}>
      {tApply("apply")}
    </Link>
  );

  // "Postularme" que lleva al sitio de la empresa (ofertas importadas o con link propio).
  const externalLink = (track: boolean) => (
    <ExternalApplyLink
      jobId={job.id}
      title={job.title}
      company={job.company_name}
      track={track}
      ariaLabel={t("applyExternalTo", { title: job.title })}
      className={buttonVariants({ className: "relative z-10 w-full gap-1.5 rounded-full" })}
    >
      {tApply("applyExternal")}
    </ExternalApplyLink>
  );

  if (viewer.mode === "none") return null;
  if (viewer.mode === "guest") {
    // Guardar queda pendiente y se hace solo al ingresar; postularse acá lleva a la oferta con el
    // formulario abierto (postularse se confirma siempre a mano). Afuera, se va directo.
    const jobPath = getPathname({ locale: locale as AppLocale, href: jobHref });
    if (part === "save") {
      return (
        <GuestAction
          kind="save-job"
          id={job.id}
          returnTo={getPathname({ locale: locale as AppLocale, href: "/" })}
          label={t("signInToSave", { title: job.title })}
          className="relative z-10 -m-2 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Bookmark aria-hidden="true" className="size-5" />
        </GuestAction>
      );
    }
    return job.external_apply ? externalLink(false) : applyLink({ pathname: "/sign-in", query: { next: `${jobPath}?postular=1` } });
  }
  if (part === "save") return <SaveJobButton jobId={job.id} title={job.title} saved={viewer.saved.has(job.id)} className="-m-2" />;
  return job.external_apply ? externalLink(true) : <QuickApplyButton jobId={job.id} slug={job.slug} title={job.title} applied={viewer.applied.has(job.id)} />;
}

export async function JobCard({ job, locale, index, viewer }: { job: JobCardData; locale: string; index?: number; viewer?: JobViewer }) {
  const t = await getTranslations("Jobs");
  const salary = formatSalaryRange(job, locale);
  const logo = companyLogoUrl(job.company_logo_path);
  const skills = (job.skills as { es: string; en: string }[]).map((s) => (locale === "en" ? s.en : s.es));
  const location = job.work_mode === "remote" ? null : [job.city, countryName(job.country, locale)].filter(Boolean).join(", ");

  return (
    <article id={index ? `resultado-${index}` : undefined} aria-labelledby={`job-${job.id}`} className="relative flex h-full flex-col gap-3 rounded-2xl bg-card shadow-soft p-5 transition-shadow hover:shadow-soft-lg">
      <div className="flex items-center gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- WebP de 256 px ya optimizado, desde nuestro Storage.
          <img src={logo} alt="" width={40} height={40} className="size-10 rounded-lg bg-muted object-contain" />
        ) : (
          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Building2 className="size-5 text-muted-foreground" />
          </span>
        )}
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          {job.company_name}
          {job.company_verified && <VerifiedBadge label={t("verified")} />}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {job.source === "imported" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
              <ExternalLink aria-hidden="true" className="size-3" />
              {t("detail.external")}
            </span>
          )}
          {viewer && <JobCardAction part="save" job={job} locale={locale} viewer={viewer} />}
        </span>
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
            <li key={skill} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">
              {skill}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {job.published_at && (
          <p className="text-xs text-muted-foreground">
            <time dateTime={job.published_at}>{timeAgo(job.published_at, locale)}</time>
          </p>
        )}
        {job.source === "native" && <ResponseBadge badge={job.company_badge} />}
      </div>
      {/* Postularse abajo, a todo el ancho y separado de la info por una línea. */}
      {viewer && viewer.mode !== "none" && (
        <div className="-mx-5 mt-1 border-t border-border px-5 pt-4">
          <JobCardAction part="apply" job={job} locale={locale} viewer={viewer} />
        </div>
      )}
    </article>
  );
}
