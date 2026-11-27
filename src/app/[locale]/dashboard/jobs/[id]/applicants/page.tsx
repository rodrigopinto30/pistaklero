import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { ApplicationStatusBadge, type ApplicationStatus } from "@/components/applications/status-badge";
import { requireRecruiterPage } from "@/lib/auth/guards";
import { timeAgo } from "@/lib/jobs/time";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { StatusForm } from "./_components/status-form";
import { Emoji } from "@/components/emoji";

const TABS = {
  received: ["received"],
  in_review: ["in_review"],
  interview: ["interview"],
  closed: ["hired", "rejected", "no_response", "withdrawn"],
} as const satisfies Record<string, readonly ApplicationStatus[]>;
type Tab = keyof typeof TABS;
const OPEN = ["received", "in_review", "interview"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Applicants");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function ApplicantsPage({ params, searchParams }: PageProps<"/[locale]/dashboard/jobs/[id]/applicants">) {
  const { id } = await params;
  const locale = (await getLocale()) as AppLocale;
  const { company } = await requireRecruiterPage(locale, { pathname: "/dashboard/jobs/[id]/applicants", params: { id } });
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("id, title, language").eq("id", id).eq("company_id", company.id).maybeSingle();
  if (!job) notFound();

  const { estado } = await searchParams;
  const tab: Tab = (Object.keys(TABS) as Tab[]).find((key) => key === estado) ?? "received";

  const [{ data: applications }, { data: questions }, t, tTabs, tProfile, format] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, created_at, candidate_id, candidates(headline, slug, availability, people(full_name)), application_answers(question_id, answer_text, answer_option)")
      .eq("job_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("job_questions").select("id, prompt, options").eq("job_id", id).order("position"),
    getTranslations("Applicants"),
    getTranslations("Applicants.tabs"),
    getTranslations("Profile.preferences.availabilityOptions"),
    getFormatter(),
  ]);

  const all = applications ?? [];
  const visible = all.filter((a) => (TABS[tab] as readonly string[]).includes(a.status));
  const candidateIds = visible.map((a) => a.candidate_id);
  // Solo vuelven las expectativas que la candidata eligió compartir con las empresas donde se postula (RLS).
  const { data: salaries } = candidateIds.length
    ? await supabase.from("candidate_salary_expectations").select("candidate_id, amount, currency, period").in("candidate_id", candidateIds)
    : { data: [] };
  // Plantillas en el idioma de la oferta (es el idioma en que la empresa le habla a quien se postula).
  const templates = [t(`templates.${job.language}.friendly`, { job: job.title }), t(`templates.${job.language}.brief`, { job: job.title })];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <Link href={{ pathname: "/dashboard/jobs/[id]", params: { id } }} className="text-sm text-violet underline-offset-4 hover:underline">
          {t("backToJob")}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title", { job: job.title })} <Emoji symbol="📥" /></h1>
      </div>

      <nav aria-label={t("tabsLabel")}>
        <ul className="flex flex-wrap gap-2">
          {(Object.keys(TABS) as Tab[]).map((key) => {
            const count = all.filter((a) => (TABS[key] as readonly string[]).includes(a.status)).length;
            return (
              <li key={key}>
                <Link
                  href={{ pathname: "/dashboard/jobs/[id]/applicants", params: { id }, query: { estado: key } }}
                  aria-current={key === tab ? "page" : undefined}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-medium aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
                >
                  {tTabs(key)}
                  <span className="rounded-full bg-muted px-2 text-xs text-foreground">{count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-card shadow-soft p-6 text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((application) => {
            const candidate = application.candidates;
            const salary = salaries?.find((s) => s.candidate_id === application.candidate_id);
            const name = candidate?.people?.full_name ?? t("unavailable");
            return (
              <li key={application.id} className="flex flex-col gap-4 rounded-2xl bg-card shadow-soft p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold">
                      {candidate ? (
                        <Link href={{ pathname: "/p/[slug]", params: { slug: candidate.slug } }} className="underline-offset-4 hover:underline">
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                    </h2>
                    {candidate?.headline && <p className="text-muted-foreground">{candidate.headline}</p>}
                    <p className="text-sm text-muted-foreground">
                      {candidate && t("availability", { value: tProfile(candidate.availability) })} ·{" "}
                      {t("appliedAgo", { when: timeAgo(application.created_at, locale) })}
                      {salary && (
                        <>
                          {" · "}
                          {t("expectation", {
                            value: format.number(salary.amount, { style: "currency", currency: salary.currency, maximumFractionDigits: 0 }),
                          })}
                        </>
                      )}
                    </p>
                  </div>
                  <ApplicationStatusBadge status={application.status} />
                </div>

                {(questions ?? []).length > 0 && (
                  <dl className="flex flex-col gap-2 rounded-xl bg-muted/60 p-3 text-sm">
                    {questions!.map((question) => {
                      const answer = application.application_answers.find((a) => a.question_id === question.id);
                      const value = answer?.answer_text ?? (answer?.answer_option != null ? question.options?.[answer.answer_option] : null);
                      return (
                        <div key={question.id} className="flex flex-col gap-0.5">
                          <dt className="text-muted-foreground">{question.prompt}</dt>
                          <dd lang={job.language}>{value ?? "—"}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}

                {(OPEN as readonly string[]).includes(application.status) && (
                  <StatusForm
                    applicationId={application.id}
                    status={application.status as (typeof OPEN)[number]}
                    candidateName={name}
                    templates={templates}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
