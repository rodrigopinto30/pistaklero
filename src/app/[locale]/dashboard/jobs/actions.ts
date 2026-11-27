"use server";

import { flash } from "@/lib/flash.server";
import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentRecruiter } from "@/lib/auth/recruiter";
import { dbErrorCode, errorState, type FormErrorCode, type FormState, formValues, successState, zodFieldErrors } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { jobInputFromForm, jobSchema } from "@/lib/validation/job";
import { redirect } from "@/i18n/navigation";
import { parseLocale } from "@/i18n/locale";

const DAY_MS = 24 * 60 * 60 * 1000;

async function requireMember() {
  const recruiter = await getCurrentRecruiter();
  if (!recruiter || recruiter.company.status !== "active") return null;
  return { ...recruiter, supabase: await createClient() };
}

function jobErrorCode(error: { message?: string; code?: string }): FormErrorCode {
  if (error.message === "unverified_limit" || error.message === "expired") return error.message;
  return dbErrorCode(error);
}

export async function saveJob(_prev: FormState, formData: FormData): Promise<FormState> {
  const values: Record<string, string> = { ...formValues(formData), skills: formData.getAll("skills").map(String).join(",") };
  const locale = parseLocale(formData.get("locale"));
  const member = await requireMember();
  if (!member) return errorState(values, {}, "unknown");

  const jobId = values.jobId ? z.uuid().safeParse(values.jobId) : null;
  if (jobId && !jobId.success) return errorState(values, {}, "unknown");
  const publish = values.intent === "publish";

  const parsed = jobSchema.safeParse(jobInputFromForm(formData));
  if (!parsed.success) return errorState(values, zodFieldErrors(parsed.error));
  const d = parsed.data;

  // Al editar, el vencimiento nunca supera los 90 días desde la creación (lo exige la base).
  let createdAt = Date.now();
  if (jobId) {
    const { data: existing } = await member.supabase.from("jobs").select("created_at").eq("id", jobId.data).single();
    if (!existing) return errorState(values, {}, "not_found");
    createdAt = new Date(existing.created_at).getTime();
  }
  const validThrough = new Date(Math.min(Date.now() + Number(d.validDays) * DAY_MS, createdAt + 90 * DAY_MS - 60_000));

  const row = {
    title: d.title,
    description: d.description,
    language: d.language,
    seniority: d.seniority,
    employment_type: d.employmentType,
    work_mode: d.workMode,
    country: d.country ?? null,
    city: d.city || null,
    salary_min: d.salaryMin,
    salary_max: d.salaryMax,
    salary_currency: d.salaryCurrency,
    salary_period: d.salaryPeriod,
    salary_basis: d.salaryBasis,
    valid_through: validThrough.toISOString(),
  };

  let id = jobId?.data;
  if (id) {
    const { error } = await member.supabase
      .from("jobs")
      .update(publish ? { ...row, status: "published" } : row)
      .eq("id", id);
    if (error) return errorState(values, {}, jobErrorCode(error));
  } else {
    const { data, error } = await member.supabase
      .from("jobs")
      .insert({ ...row, company_id: member.company.id, source: "native", status: publish ? "published" : "draft" })
      .select("id")
      .single();
    if (error || !data) return errorState(values, {}, error ? jobErrorCode(error) : "unknown");
    id = data.id;
  }

  // Tecnologías y preguntas: se reemplazan por las del formulario.
  await member.supabase.from("job_skills").delete().eq("job_id", id);
  if (d.skills.length > 0) {
    await member.supabase.from("job_skills").insert(d.skills.map((skill_id) => ({ job_id: id!, skill_id })));
  }
  // Con postulaciones, las preguntas quedan fijas (las respuestas dejarían de tener sentido).
  const { count: applications } = await member.supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("job_id", id);
  const questions = [d.question1, d.question2].filter((q) => q.type !== "none");
  if (!applications) await member.supabase.from("job_questions").delete().eq("job_id", id);
  if (!applications && questions.length > 0) {
    const { error } = await member.supabase.from("job_questions").insert(
      questions.map((q, index) => ({
        job_id: id!,
        position: index + 1,
        type: q.type as "short_text" | "single_choice",
        prompt: q.prompt,
        options: q.type === "single_choice" ? q.optionList : null,
      }))
    );
    if (error) return errorState(values, {}, dbErrorCode(error));
  }

  refresh();
  if (!jobId) redirect({ href: { pathname: "/dashboard/jobs/[id]", params: { id } }, locale });
  return successState();
}

export async function setJobStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const member = await requireMember();
  const jobId = z.uuid().safeParse(formData.get("jobId"));
  const status = z.enum(["published", "closed"]).safeParse(formData.get("status"));
  if (!member || !jobId.success || !status.success) return errorState({}, {}, "unknown");

  const { error } = await member.supabase.from("jobs").update({ status: status.data }).eq("id", jobId.data);
  if (error) return errorState({}, {}, jobErrorCode(error));

  refresh();
  return successState();
}

export async function deleteDraft(formData: FormData) {
  const member = await requireMember();
  const jobId = z.uuid().safeParse(formData.get("jobId"));
  const locale = parseLocale(formData.get("locale"));
  if (!member || !jobId.success) return;
  await member.supabase.from("jobs").delete().eq("id", jobId.data).eq("status", "draft");
  await flash("removed");
  refresh();
  redirect({ href: "/dashboard", locale });
}
