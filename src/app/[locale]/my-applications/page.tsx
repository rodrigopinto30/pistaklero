import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { ApplicationStatusBadge } from "@/components/applications/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { timeAgo } from "@/lib/jobs/time";
import { createClient } from "@/lib/supabase/server";
import { getPathname, Link, redirect } from "@/i18n/navigation";
import { withdrawApplication } from "./actions";
import { removeExternalApplication } from "@/lib/applications/actions";
import { Emoji } from "@/components/emoji";
import { ConfirmButton } from "@/components/confirm-button";

const OPEN = ["received", "in_review", "interview"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Applications");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function MyApplicationsPage() {
  const locale = await getLocale();
  if (!(await getCurrentUser())) {
    redirect({ href: { pathname: "/sign-in", query: { next: getPathname({ locale, href: "/my-applications" }) } }, locale });
  }
  const profile = await getCurrentProfile();
  if (!profile) redirect({ href: "/welcome", locale });
  if (profile?.role !== "candidate") redirect({ href: "/", locale });

  const t = await getTranslations("Applications");
  const tConfirm = await getTranslations("Confirm");
  const tStatus = await getTranslations("Applications.status");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: applications } = await supabase
    .from("applications")
    .select("id, status, created_at, status_changed_at, rejection_message, jobs(title, slug, language, companies(name, slug)), application_events(id, to_status, created_at)")
    .eq("candidate_id", profile!.id)
    .order("created_at", { ascending: false });
  // Las que contó que hizo en el sitio de la empresa ("¿Te postulaste?" → "Sí").
  const { data: external } = await supabase
    .from("external_applications")
    .select("job_id, created_at, jobs(title, slug, language, companies(name, slug))")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")} <Emoji symbol="📬" /></h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {(applications ?? []).length === 0 && (external ?? []).length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-card shadow-soft p-6">
          <p>{t("empty")}</p>
          <Link href="/" className={buttonVariants()}>
            {t("browse")}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {applications!.map((application) => {
            const job = application.jobs;
            const events = [...(application.application_events ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
            return (
              <li key={application.id} className="flex flex-col gap-3 rounded-2xl bg-card shadow-soft p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <h2 lang={job?.language} className="text-lg font-semibold">
                      {job ? (
                        <Link href={{ pathname: "/jobs/[slug]", params: { slug: job.slug } }} className="underline-offset-4 hover:underline">
                          {job.title}
                        </Link>
                      ) : (
                        t("removedJob")
                      )}
                    </h2>
                    {job?.companies && (
                      <Link
                        href={{ pathname: "/companies/[slug]", params: { slug: job.companies.slug } }}
                        className="inline-flex min-h-6 items-center self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        {job.companies.name}
                      </Link>
                    )}
                  </div>
                  <ApplicationStatusBadge status={application.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("appliedOn", { date: format.dateTime(new Date(application.created_at), { dateStyle: "medium" }) })} ·{" "}
                  {t("lastChange", { when: timeAgo(application.status_changed_at, locale) })}
                </p>
                {application.status === "rejected" && application.rejection_message && (
                  <blockquote className="border-l-2 border-input pl-4 text-sm whitespace-pre-line">{application.rejection_message}</blockquote>
                )}
                <details>
                  <summary className="inline-flex min-h-9 cursor-pointer items-center text-sm text-violet underline-offset-4 hover:underline">
                    {t("history")}
                  </summary>
                  <ol className="mt-2 flex flex-col gap-1 text-sm">
                    {events.map((event) => (
                      <li key={event.id}>
                        <time dateTime={event.created_at}>{format.dateTime(new Date(event.created_at), { dateStyle: "medium", timeStyle: "short" })}</time>
                        {" — "}
                        {tStatus(event.to_status)}
                      </li>
                    ))}
                  </ol>
                </details>
                {OPEN.includes(application.status) && (
                  <form action={withdrawApplication}>
                    <input type="hidden" name="applicationId" value={application.id} />
                    <ConfirmButton variant="ghost" ariaLabel={t("withdrawFrom", { job: job?.title ?? "" })} title={tConfirm("withdraw.title", { job: job?.title ?? "" })} description={tConfirm("withdraw.description")} confirmLabel={tConfirm("withdrawConfirm")}>
                      {t("withdraw")}
                    </ConfirmButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {(external ?? []).length > 0 && (
        <section aria-labelledby="external-title" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="external-title" className="text-xl font-semibold tracking-tight">
              {t("external.title")} <Emoji symbol="🌐" />
            </h2>
            <p className="text-sm text-muted-foreground">{t("external.hint")}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {external!.map((item) => (
              <li key={item.job_id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-5 shadow-soft">
                <div className="flex flex-col gap-1">
                  {item.jobs ? (
                    <Link href={{ pathname: "/jobs/[slug]", params: { slug: item.jobs.slug } }} lang={item.jobs.language} className="font-semibold underline-offset-4 hover:underline">
                      {item.jobs.title}
                    </Link>
                  ) : (
                    <span className="font-semibold">{t("removedJob")}</span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {item.jobs?.companies?.name}
                    {" · "}
                    {t("external.appliedOn", { date: format.dateTime(new Date(item.created_at), { dateStyle: "medium" }) })}
                  </span>
                </div>
                <form action={removeExternalApplication}>
                  <input type="hidden" name="jobId" value={item.job_id} />
                  <ConfirmButton variant="ghost" ariaLabel={t("external.removeFrom", { job: item.jobs?.title ?? "" })} title={t("external.removeTitle", { job: item.jobs?.title ?? "" })} description={t("external.removeHint")} confirmLabel={tConfirm("remove")}>
                    {t("external.remove")}
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
