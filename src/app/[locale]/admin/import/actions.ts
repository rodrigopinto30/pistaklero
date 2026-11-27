"use server";

import { getCurrentProfile } from "@/lib/auth/session";
import { extractJob, MAX_POSTING_CHARS } from "@/lib/ai/extract-job";
import { dbErrorCode, errorState, type FormState, formValues, successState, zodFieldErrors } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { importedJobSchema } from "@/lib/validation/import";

const DAY_MS = 86_400_000;

async function isAdmin() {
  const profile = await getCurrentProfile();
  return profile?.role === "admin" && !profile.suspended_at;
}

export type ExtractState =
  | { status: "idle" }
  | { status: "extracted"; values: Record<string, string>; run: number }
  | { status: "error"; code: "disabled" | "refused" | "failed" | "empty" | "too_long" };

/** Paso 1: Claude lee el texto pegado y propone los campos. Nada se publica todavía. */
export async function extractPosting(_prev: ExtractState, formData: FormData): Promise<ExtractState> {
  if (!(await isAdmin())) return { status: "error", code: "failed" };
  const posting = String(formData.get("posting") ?? "").trim();
  if (posting.length < 50) return { status: "error", code: "empty" };
  if (posting.length > MAX_POSTING_CHARS) return { status: "error", code: "too_long" };

  const result = await extractJob(posting);
  if (!result.ok) return { status: "error", code: result.code };

  const job = result.job;
  const text = (value: string | number | null) => (value == null ? "" : String(value));
  return {
    status: "extracted",
    run: Date.now(),
    values: {
      companyName: job.companyName,
      companyWebsite: text(job.companyWebsite),
      title: job.title,
      summary: job.summary.slice(0, 600),
      language: job.language,
      seniority: job.seniority,
      employmentType: job.employmentType,
      workMode: job.workMode,
      country: text(job.country)?.toUpperCase(),
      city: text(job.city),
      salaryMin: text(job.salaryMin),
      salaryMax: text(job.salaryMax),
      salaryCurrency: text(job.salaryCurrency),
      salaryPeriod: text(job.salaryPeriod),
      salaryBasis: text(job.salaryBasis),
    },
  };
}

/** Paso 2: el admin revisa y publica. La empresa se crea sin reclamar si no existe. */
export async function publishImportedJob(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  if (!(await isAdmin())) return errorState(values, {}, "unknown");

  const parsed = importedJobSchema.safeParse(values);
  if (!parsed.success) return errorState(values, zodFieldErrors(parsed.error));
  const d = parsed.data;

  const supabase = await createClient();
  const { data: companyId, error: companyError } = await supabase.rpc("admin_upsert_unclaimed_company", {
    p_name: d.companyName,
    p_website_url: d.companyWebsite ?? "",
  });
  if (companyError || !companyId) return errorState(values, {}, dbErrorCode(companyError));

  const { error } = await supabase.from("jobs").insert({
    company_id: companyId,
    source: "imported",
    status: "published",
    external_provider: "manual",
    external_url: d.externalUrl,
    title: d.title,
    summary: d.summary,
    language: d.language,
    seniority: d.seniority,
    employment_type: d.employmentType,
    work_mode: d.workMode,
    country: d.country ?? null,
    city: d.city || null,
    salary_min: d.salaryMin ?? null,
    salary_max: d.salaryMax ?? null,
    salary_currency: d.salaryCurrency ?? null,
    salary_period: d.salaryPeriod ?? null,
    salary_basis: d.salaryBasis ?? null,
    valid_through: new Date(Date.now() + Number(d.validDays) * DAY_MS).toISOString(),
  });
  if (error) return errorState(values, {}, dbErrorCode(error));
  return successState();
}
