import { Bookmark } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { JobCard } from "@/components/jobs/job-card";
import { SaveJobButton } from "@/components/jobs/save-job-button";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { getJobViewer } from "@/lib/jobs/viewer";
import { createClient } from "@/lib/supabase/server";
import { getPathname, Link, redirect } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Saved");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function SavedPage() {
  const locale = await getLocale();
  if (!(await getCurrentUser())) {
    redirect({ href: { pathname: "/sign-in", query: { next: getPathname({ locale, href: "/saved" }) } }, locale });
  }
  const profile = await getCurrentProfile();
  if (!profile) redirect({ href: "/welcome", locale });
  if (profile?.role !== "candidate") redirect({ href: "/", locale });

  const t = await getTranslations("Saved");
  const supabase = await createClient();
  const [{ data: cards }, { data: all }] = await Promise.all([
    supabase.rpc("saved_job_cards"),
    // También las que ya cerraron: se listan aparte para poder sacarlas.
    supabase.from("saved_jobs").select("job_id, jobs(title)").order("created_at", { ascending: false }),
  ]);
  const open = cards ?? [];
  const openIds = new Set(open.map((job) => job.id));
  const closed = (all ?? []).filter((row) => !openIds.has(row.job_id));
  const viewer = await getJobViewer(open.map((job) => job.id));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section aria-labelledby="saved-jobs" className="flex flex-col gap-4">
        <h2 id="saved-jobs" className="text-xl font-semibold">
          {t("jobs", { count: open.length })}
        </h2>
        {open.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl bg-card p-6 shadow-soft">
            <p className="flex items-center gap-2">
              <Bookmark aria-hidden="true" className="size-5 text-muted-foreground" />
              {t("empty")}
            </p>
            <Link href="/" className={buttonVariants()}>
              {t("browse")}
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((job) => (
              <li key={job.id}>
                <JobCard job={job} locale={locale} viewer={viewer} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {closed.length > 0 && (
        <section aria-labelledby="saved-closed" className="flex flex-col gap-3">
          <h2 id="saved-closed" className="text-lg font-semibold">
            {t("closed")}
          </h2>
          <ul className="flex flex-col gap-2">
            {closed.map((row) => (
              <li key={row.job_id} className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-2 shadow-soft">
                <span className="text-muted-foreground">{row.jobs?.title ?? t("unavailable")}</span>
                <SaveJobButton jobId={row.job_id} title={row.jobs?.title ?? t("unavailable")} saved />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
