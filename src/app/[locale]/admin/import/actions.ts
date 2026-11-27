"use server";

import { flash } from "@/lib/flash.server";
import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import { BOARD_TOKEN, PROVIDERS } from "@/lib/import/providers";
import { syncImportSource } from "@/lib/import/sync";
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

// ---------------------------------------------------------------------------
// Tableros sincronizados (Greenhouse, Lever, Ashby, Workable)
// ---------------------------------------------------------------------------

export type SourceState = { status: "idle" } | { status: "done"; run: number } | { status: "error"; code: string; run: number };

const sourceSchema = z.object({
  companyName: z.string().trim().min(2).max(80),
  websiteUrl: z.union([z.literal(""), z.url({ protocol: /^https$/ })]),
  provider: z.enum(PROVIDERS),
  boardToken: z.string().trim().regex(BOARD_TOKEN),
});

/** Agrega un tablero y lo sincroniza en el momento, para ver enseguida si el identificador es correcto. */
export async function addImportSource(_prev: SourceState, formData: FormData): Promise<SourceState> {
  const run = Date.now();
  if (!(await isAdmin())) return { status: "error", code: "unknown", run };
  const parsed = sourceSchema.safeParse({
    companyName: formData.get("companyName"),
    websiteUrl: String(formData.get("websiteUrl") ?? "").trim(),
    provider: formData.get("provider"),
    boardToken: formData.get("boardToken"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { status: "error", code: typeof field === "string" ? `invalid_${field}` : "unknown", run };
  }

  const supabase = await createClient();
  const { data: sourceId, error } = await supabase.rpc("admin_add_import_source", {
    p_company_name: parsed.data.companyName,
    p_website_url: parsed.data.websiteUrl,
    p_provider: parsed.data.provider,
    p_board_token: parsed.data.boardToken,
  });
  if (error || !sourceId) {
    return { status: "error", code: error?.message === "source_exists" ? "source_exists" : "unknown", run };
  }
  await syncImportSource(sourceId);
  refresh();
  return { status: "done", run };
}

export async function syncSourceNow(formData: FormData) {
  const sourceId = z.uuid().safeParse(formData.get("sourceId"));
  if (!(await isAdmin()) || !sourceId.success) return;
  await syncImportSource(sourceId.data);
  await flash("done");
  refresh();
}

export async function setSourceActive(formData: FormData) {
  const sourceId = z.uuid().safeParse(formData.get("sourceId"));
  if (!(await isAdmin()) || !sourceId.success) return;
  const supabase = await createClient();
  await supabase.rpc("admin_set_import_source_active", { p_source_id: sourceId.data, p_active: formData.get("active") === "true" });
  await flash("done");
  refresh();
}
