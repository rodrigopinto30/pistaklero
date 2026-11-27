import { getLocale, getTranslations } from "next-intl/server";
import { ApplicationStatusBadge } from "@/components/applications/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPathname, Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { ApplyForm } from "./apply-form";

const MISSING = ["headline", "skills", "experience"] as const;

/** Lo que ve cada persona en el lugar del botón "Postularme". */
export async function ApplyPanel({ jobId, slug }: { jobId: string; slug: string }) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("Apply");

  if (!(await getCurrentUser())) {
    const next = getPathname({ locale, href: { pathname: "/jobs/[slug]", params: { slug } } });
    return (
      <Link href={{ pathname: "/sign-in", query: { next } }} className={buttonVariants({ size: "lg", className: "w-full" })}>
        {t("signInToApply")}
      </Link>
    );
  }

  const profile = await getCurrentProfile();
  if (profile?.role !== "candidate") return <p className="text-sm text-muted-foreground">{t("onlyCandidates")}</p>;

  const supabase = await createClient();
  const [{ data: existing }, { data: missing }, { data: questions }] = await Promise.all([
    supabase.from("applications").select("status").eq("job_id", jobId).eq("candidate_id", profile.id).maybeSingle(),
    supabase.rpc("candidate_missing_requirements", { p_candidate_id: profile.id }),
    supabase.from("job_questions").select("id, type, prompt, options, required").eq("job_id", jobId).order("position"),
  ]);

  if (existing) {
    return (
      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          {t("alreadyApplied")} <ApplicationStatusBadge status={existing.status} />
        </p>
        <Link href="/my-applications" className={buttonVariants({ variant: "outline" })}>
          {t("viewApplications")}
        </Link>
      </div>
    );
  }

  const pending = MISSING.filter((item) => missing?.includes(item));
  if (pending.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">{t("incompleteTitle")}</p>
        <ul className="ml-5 list-disc text-sm text-muted-foreground">
          {pending.map((item) => (
            <li key={item}>{t(`missing.${item}`)}</li>
          ))}
        </ul>
        <Link href="/profile" className={buttonVariants()}>
          {t("completeProfile")}
        </Link>
      </div>
    );
  }

  return <ApplyForm jobId={jobId} questions={questions ?? []} />;
}
