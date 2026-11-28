import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/back-link";
import { JobStatusBadge } from "@/components/jobs/job-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { isExpired } from "@/lib/jobs/format";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type Tab = "summary" | "applicants" | "edit";
type JobHead = { id: string; title: string; slug: string; status: "draft" | "published" | "closed" | "hidden"; valid_through: string };

/**
 * Encabezado de cada oferta en el panel: volver a "Mis ofertas", el puesto con su estado, el aviso
 * público (si está publicado) y las pestañas Resumen · Postulantes · Editar.
 */
export async function JobManageHeader({ job, current, heading }: { job: JobHead; current: Tab; heading?: string }) {
  const t = await getTranslations("MyJobs");
  const tJobs = await getTranslations("Jobs");
  const params = { id: job.id };
  const tabs = [
    { key: "summary", href: { pathname: "/dashboard/jobs/[id]" as const, params } },
    { key: "applicants", href: { pathname: "/dashboard/jobs/[id]/applicants" as const, params } },
    { key: "edit", href: { pathname: "/dashboard/jobs/[id]/edit" as const, params } },
  ] as const;
  const live = job.status === "published" && !isExpired(job.valid_through);

  return (
    <div className="flex flex-col gap-4">
      <BackLink fallback="/dashboard/jobs" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col items-start gap-2">
          <h1 className="text-3xl font-semibold tracking-tight break-words">{heading ?? job.title}</h1>
          <JobStatusBadge status={job.status} validThrough={job.valid_through} />
        </div>
        {live && (
          <Link href={{ pathname: "/jobs/[slug]", params: { slug: job.slug } }} className={buttonVariants({ variant: "outline" })}>
            <ExternalLink aria-hidden="true" />
            {tJobs("viewPublic")}
          </Link>
        )}
      </div>
      <nav aria-label={t("tabsLabel")} className="-mx-4 overflow-x-auto px-4">
        <ul className="flex w-max min-w-full gap-1 border-b border-border">
          {tabs.map((tab) => (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={current === tab.key ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 items-center px-4 text-sm font-medium transition-colors",
                  current === tab.key ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  "after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-foreground after:opacity-0",
                  current === tab.key && "after:opacity-100"
                )}
              >
                {t(`tabs.${tab.key}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
