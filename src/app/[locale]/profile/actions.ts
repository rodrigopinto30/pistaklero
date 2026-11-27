"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth/session";
import {
  dbErrorCode,
  errorState,
  type FormState,
  formValues,
  successState,
  zodFieldErrors,
} from "@/lib/forms";
import { refreshProjectPreview, removeProjectPreview } from "@/lib/projects/preview";
import { createClient } from "@/lib/supabase/server";
import {
  basicsSchema,
  ENTRY_BLOCKS,
  type EntryBlock,
  entrySchemas,
  preferencesSchema,
  salarySchema,
  skillSchema,
} from "@/lib/validation/profile";

/** Solo una candidata puede editar su perfil. Las políticas RLS lo vuelven a verificar. */
async function requireCandidate() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "candidate" || profile.suspended_at) return null;
  return { supabase: await createClient(), userId: profile.id };
}

const unknownError = (values: Record<string, string>) => errorState(values, {}, "unknown");

// ---------------------------------------------------------------------------
// Datos básicos y preferencias
// ---------------------------------------------------------------------------

export async function updateBasics(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const auth = await requireCandidate();
  if (!auth) return unknownError(values);

  const parsed = basicsSchema.safeParse({ ...values, languages: formData.getAll("languages") });
  if (!parsed.success) return errorState(values, zodFieldErrors(parsed.error));

  const d = parsed.data;
  const { error } = await auth.supabase
    .from("candidates")
    .update({
      full_name: d.fullName,
      headline: d.headline,
      bio: d.bio,
      country: d.country ?? null,
      city: d.city || null,
      languages: d.languages,
      github_url: d.githubUrl ?? null,
      linkedin_url: d.linkedinUrl ?? null,
      website_url: d.websiteUrl ?? null,
    })
    .eq("user_id", auth.userId);
  if (error) return errorState(values, {}, dbErrorCode(error));

  refresh();
  return successState();
}

export async function updatePreferences(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const auth = await requireCandidate();
  if (!auth) return unknownError(values);

  const parsed = preferencesSchema.safeParse(values);
  if (!parsed.success) return errorState(values, zodFieldErrors(parsed.error));

  const { error } = await auth.supabase
    .from("candidates")
    .update({ availability: parsed.data.availability, visibility: parsed.data.visibility })
    .eq("user_id", auth.userId);
  if (error) return errorState(values, {}, dbErrorCode(error));

  refresh();
  return successState();
}

// ---------------------------------------------------------------------------
// Expectativa salarial
// ---------------------------------------------------------------------------

export async function saveSalary(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const auth = await requireCandidate();
  if (!auth) return unknownError(values);

  const parsed = salarySchema.safeParse(values);
  if (!parsed.success) return errorState(values, zodFieldErrors(parsed.error));

  const row = {
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    period: parsed.data.period,
    basis: parsed.data.basis,
    visibility: parsed.data.salaryVisibility,
  };
  const { data: existing } = await auth.supabase
    .from("candidate_salary_expectations")
    .select("candidate_id")
    .eq("candidate_id", auth.userId)
    .maybeSingle();

  const { error } = existing
    ? await auth.supabase.from("candidate_salary_expectations").update(row).eq("candidate_id", auth.userId)
    : await auth.supabase.from("candidate_salary_expectations").insert({ ...row, candidate_id: auth.userId });
  if (error) return errorState(values, {}, dbErrorCode(error));

  refresh();
  return successState();
}

export async function deleteSalary() {
  const auth = await requireCandidate();
  if (!auth) return;
  await auth.supabase.from("candidate_salary_expectations").delete().eq("candidate_id", auth.userId);
  refresh();
}

// ---------------------------------------------------------------------------
// Habilidades
// ---------------------------------------------------------------------------

export async function addSkill(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const auth = await requireCandidate();
  if (!auth) return unknownError(values);

  const parsed = skillSchema.safeParse(values);
  if (!parsed.success) return errorState(values, zodFieldErrors(parsed.error));

  const { error } = await auth.supabase
    .from("candidate_skills")
    .insert({ candidate_id: auth.userId, skill_id: parsed.data.skillId, level: parsed.data.level });
  if (error) return errorState(values, {}, dbErrorCode(error));

  refresh();
  return successState();
}

export async function updateSkillLevel(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const auth = await requireCandidate();
  if (!auth) return unknownError(values);

  const parsed = skillSchema.safeParse(values);
  if (!parsed.success) return errorState(values, zodFieldErrors(parsed.error));

  const { error } = await auth.supabase
    .from("candidate_skills")
    .update({ level: parsed.data.level })
    .eq("candidate_id", auth.userId)
    .eq("skill_id", parsed.data.skillId);
  if (error) return errorState(values, {}, dbErrorCode(error));

  refresh();
  return successState();
}

export async function removeSkill(formData: FormData) {
  const auth = await requireCandidate();
  const skillId = z.uuid().safeParse(formData.get("skillId"));
  if (!auth || !skillId.success) return;
  await auth.supabase.from("candidate_skills").delete().eq("candidate_id", auth.userId).eq("skill_id", skillId.data);
  refresh();
}

// ---------------------------------------------------------------------------
// Bloques: experiencia, formación, certificaciones y proyectos
// ---------------------------------------------------------------------------

const blockSchema = z.enum(ENTRY_BLOCKS as [EntryBlock, ...EntryBlock[]]);

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Guarda (crea o edita) una fila del bloque. Cada tabla tiene sus columnas. */
async function writeEntry(supabase: Supabase, userId: string, block: EntryBlock, id: string | null, values: Record<string, string>) {
  switch (block) {
    case "experience": {
      const d = entrySchemas.experience.parse(values);
      const row = { company_name: d.companyName, title: d.title, start_date: d.startDate, end_date: d.endDate ?? null, description: d.description };
      return id
        ? supabase.from("candidate_experiences").update(row).eq("id", id)
        : supabase.from("candidate_experiences").insert({ ...row, candidate_id: userId });
    }
    case "education": {
      const d = entrySchemas.education.parse(values);
      const row = { institution: d.institution, degree: d.degree, start_date: d.startDate, end_date: d.endDate ?? null };
      return id
        ? supabase.from("candidate_education").update(row).eq("id", id)
        : supabase.from("candidate_education").insert({ ...row, candidate_id: userId });
    }
    case "certification": {
      const d = entrySchemas.certification.parse(values);
      const row = { name: d.name, issuer: d.issuer, issued_on: d.issuedOn ?? null, credential_url: d.credentialUrl ?? null };
      return id
        ? supabase.from("candidate_certifications").update(row).eq("id", id)
        : supabase.from("candidate_certifications").insert({ ...row, candidate_id: userId });
    }
    case "project": {
      const d = entrySchemas.project.parse(values);
      const row = { title: d.title, description: d.description, url: d.url ?? null, repo_url: d.repoUrl ?? null };
      return id
        ? supabase.from("candidate_projects").update(row).eq("id", id).select("id").single()
        : supabase.from("candidate_projects").insert({ ...row, candidate_id: userId }).select("id").single();
    }
  }
}

const ENTRY_TABLES = {
  experience: "candidate_experiences",
  education: "candidate_education",
  certification: "candidate_certifications",
  project: "candidate_projects",
} as const;

export async function saveEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const auth = await requireCandidate();
  const block = blockSchema.safeParse(values.block);
  const id = values.id ? z.uuid().safeParse(values.id) : null;
  if (!auth || !block.success || (id && !id.success)) return unknownError(values);

  const parsed = entrySchemas[block.data].safeParse(values);
  if (!parsed.success) return errorState(values, zodFieldErrors(parsed.error));

  const { data, error } = await writeEntry(auth.supabase, auth.userId, block.data, id?.data ?? null, values);
  if (error) return errorState(values, {}, dbErrorCode(error));

  if (block.data === "project" && data && "id" in data) {
    // La vista previa se baja después de responder: puede tardar y nunca tiene que frenar el guardado.
    const projectUrl = entrySchemas.project.parse(values).url ?? null;
    const { userId } = auth;
    after(() => refreshProjectPreview(data.id, userId, projectUrl));
  }

  refresh();
  return successState();
}

export async function deleteEntry(formData: FormData) {
  const auth = await requireCandidate();
  const block = blockSchema.safeParse(formData.get("block"));
  const id = z.uuid().safeParse(formData.get("id"));
  if (!auth || !block.success || !id.success) return;
  if (block.data === "project") {
    const { data: removed } = await auth.supabase
      .from("candidate_projects")
      .delete()
      .eq("id", id.data)
      .eq("candidate_id", auth.userId)
      .select("preview_path")
      .maybeSingle();
    after(() => removeProjectPreview(removed?.preview_path ?? null));
  } else {
    await auth.supabase.from(ENTRY_TABLES[block.data]).delete().eq("id", id.data).eq("candidate_id", auth.userId);
  }
  refresh();
}

// ---------------------------------------------------------------------------
// Empresas bloqueadas
// ---------------------------------------------------------------------------

export type CompanySearchState =
  | { status: "idle" }
  | { status: "results"; query: string; companies: { id: string; name: string; domain: string | null }[] };

export async function searchCompaniesToBlock(_prev: CompanySearchState, formData: FormData): Promise<CompanySearchState> {
  const auth = await requireCandidate();
  const query = String(formData.get("query") ?? "").trim().slice(0, 80);
  if (!auth || query.length < 2) return { status: "results", query, companies: [] };

  // Comodines de LIKE escapados: lo que escribe la persona se busca literal.
  const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  // Dos consultas parametrizadas (por nombre y por dominio) en lugar de armar un filtro `or` con texto.
  const [{ data: byName }, { data: byDomain }, { data: blocked }] = await Promise.all([
    auth.supabase.from("companies").select("id, name, domain").ilike("name", pattern).limit(6),
    auth.supabase.from("companies").select("id, name, domain").ilike("domain", pattern).limit(6),
    auth.supabase.from("candidate_blocked_companies").select("company_id"),
  ]);
  const blockedIds = new Set((blocked ?? []).map((b) => b.company_id));
  const unique = new Map([...(byName ?? []), ...(byDomain ?? [])].map((c) => [c.id, c]));
  const companies = [...unique.values()].filter((c) => !blockedIds.has(c.id)).slice(0, 5);
  return { status: "results", query, companies };
}

export async function blockCompany(formData: FormData) {
  const auth = await requireCandidate();
  const companyId = z.uuid().safeParse(formData.get("companyId"));
  if (!auth || !companyId.success) return;
  await auth.supabase.from("candidate_blocked_companies").insert({ candidate_id: auth.userId, company_id: companyId.data });
  refresh();
}

export async function unblockCompany(formData: FormData) {
  const auth = await requireCandidate();
  const companyId = z.uuid().safeParse(formData.get("companyId"));
  if (!auth || !companyId.success) return;
  await auth.supabase.from("candidate_blocked_companies").delete().eq("candidate_id", auth.userId).eq("company_id", companyId.data);
  refresh();
}
