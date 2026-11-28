import { Bookmark } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CompanyCard } from "@/components/companies/company-card";
import { JobCard } from "@/components/jobs/job-card";
import { Masonry } from "@/components/masonry";
import { PostCard } from "@/components/posts/post-card";
import { SaveJobButton } from "@/components/jobs/save-job-button";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { getJobViewer } from "@/lib/jobs/viewer";
import { createClient } from "@/lib/supabase/server";
import { getPathname, Link, redirect } from "@/i18n/navigation";
import { Emoji } from "@/components/emoji";
import { BackLink } from "@/components/back-link";
import { TalentCard } from "@/components/talent/talent-card";
import { getCurrentRecruiter } from "@/lib/auth/recruiter";

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
  // Empleos guardan solo los candidatos; publicaciones, cualquiera.
  const isCandidate = profile?.role === "candidate";
  const recruiter = profile?.role === "recruiter" ? await getCurrentRecruiter() : null;

  const t = await getTranslations("Saved");
  const supabase = await createClient();
  const [{ data: cards }, { data: all }, { data: savedPosts }, { data: savedCompanies }] = await Promise.all([
    supabase.rpc("saved_job_cards"),
    // También las que ya cerraron: se listan aparte para poder sacarlas.
    supabase.from("saved_jobs").select("job_id, jobs(title)").order("created_at", { ascending: false }),
    supabase.rpc("post_cards", { p_saved_only: true, p_limit: 60 }),
    supabase.rpc("company_cards", { p_saved_only: true, p_limit: 60 }),
  ]);
  // Las empresas guardan perfiles (la lista es de todo el equipo).
  const savedPeople = recruiter ? ((await supabase.rpc("saved_candidate_cards")).data ?? []) : [];
  const tPeople = await getTranslations("SavedCandidates");
  const open = cards ?? [];
  const openIds = new Set(open.map((job) => job.id));
  const closed = (all ?? []).filter((row) => !openIds.has(row.job_id));
  const viewer = await getJobViewer(open.map((job) => job.id));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <BackLink fallback="/" />
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")} <Emoji symbol="🔖" /></h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {recruiter && (
        <section aria-labelledby="saved-people" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="saved-people" className="text-xl font-semibold">
              {tPeople("sectionTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">{tPeople("sectionHint", { company: recruiter.company.name })}</p>
          </div>
          {savedPeople.length === 0 ? (
            <p className="rounded-2xl bg-card p-6 text-muted-foreground shadow-soft">{tPeople("empty")}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {savedPeople.map((person) => (
                <li key={person.user_id}>
                  <TalentCard person={person} locale={locale} saved headingLevel={3} note={person.saved_by_name ? tPeople("savedBy", { name: person.saved_by_name }) : undefined} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isCandidate && (
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
      )}

      <section aria-labelledby="saved-companies" className="flex flex-col gap-4">
        <h2 id="saved-companies" className="text-xl font-semibold">
          {t("companies", { count: (savedCompanies ?? []).length })}
        </h2>
        {(savedCompanies ?? []).length === 0 ? (
          <p className="rounded-2xl bg-card p-6 text-muted-foreground shadow-soft">{t("emptyCompanies")}</p>
        ) : (
          <Masonry>
            {savedCompanies!.map((company) => (
              <li key={company.id}>
                <CompanyCard company={company} locale={locale} signedIn />
              </li>
            ))}
          </Masonry>
        )}
      </section>

      <section aria-labelledby="saved-posts" className="flex flex-col gap-4">
        <h2 id="saved-posts" className="text-xl font-semibold">
          {t("posts", { count: (savedPosts ?? []).length })}
        </h2>
        {(savedPosts ?? []).length === 0 ? (
          <p className="rounded-2xl bg-card p-6 text-muted-foreground shadow-soft">{t("emptyPosts")}</p>
        ) : (
          <Masonry>
            {savedPosts!.map((post) => (
              <li key={post.id}>
                <PostCard post={post} locale={locale} signedIn />
              </li>
            ))}
          </Masonry>
        )}
      </section>

      {isCandidate && closed.length > 0 && (
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
