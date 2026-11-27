"use server";

import { flash } from "@/lib/flash.server";
import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentRecruiter } from "@/lib/auth/recruiter";
import { dbErrorCode, errorState, type FormState, formValues, successState, zodFieldErrors } from "@/lib/forms";
import { processCover, processLogo } from "@/lib/images";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { companyDetailsSchema, companyWebsiteSchema } from "@/lib/validation/company";

const LOGO_BUCKET = "company-logos";

/** Solo miembros de una empresa activa. RLS lo vuelve a verificar en cada consulta. */
async function requireMember() {
  const recruiter = await getCurrentRecruiter();
  if (!recruiter || recruiter.company.status !== "active") return null;
  return { ...recruiter, supabase: await createClient() };
}

export async function updateCompanyDetails(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const member = await requireMember();
  if (!member) return errorState(values, {}, "unknown");

  const parsed = companyDetailsSchema.safeParse(values);
  if (!parsed.success) return errorState(values, zodFieldErrors(parsed.error));

  const d = parsed.data;
  const { error } = await member.supabase
    .from("companies")
    .update({
      name: d.name,
      description: d.description,
      industry: d.industry || null,
      size: d.size ?? null,
      stage: d.stage ?? null,
      country: d.country ?? null,
      city: d.city || null,
      linkedin_url: d.linkedinUrl ?? null,
      x_url: d.xUrl ?? null,
      instagram_url: d.instagramUrl ?? null,
    })
    .eq("id", member.company.id);
  if (error) return errorState(values, {}, dbErrorCode(error));

  refresh();
  return successState();
}

export async function updateCompanyWebsite(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const member = await requireMember();
  if (!member) return errorState(values, {}, "unknown");

  const parsed = companyWebsiteSchema.safeParse(values);
  if (!parsed.success) return errorState(values, zodFieldErrors(parsed.error));

  const { error } = await member.supabase.rpc("update_company_website", { p_website_url: parsed.data.websiteUrl ?? "" });
  if (error) {
    if (error.message === "company_exists") return errorState(values, { websiteUrl: { code: "invalid" } }, "company_exists");
    return errorState(values, {}, dbErrorCode(error));
  }

  refresh();
  return successState();
}

export async function uploadCompanyLogo(_prev: FormState, formData: FormData): Promise<FormState> {
  const member = await requireMember();
  if (!member) return errorState({}, {}, "unknown");

  const logo = await processLogo(formData.get("logo"));
  if (!logo.ok) return errorState({}, { logo: { code: "invalid" } }, logo.code);

  // Nombre aleatorio: no se adivina y cada versión tiene su URL (sin problemas de caché).
  const path = `${member.company.id}/${randomUUID().replaceAll("-", "")}.webp`;
  const admin = createAdminClient();
  const upload = await admin.storage
    .from(LOGO_BUCKET)
    .upload(path, logo.webp, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (upload.error) {
    console.error("No se pudo subir el logo", { message: upload.error.message });
    return errorState({}, {}, "unknown");
  }

  const { error } = await member.supabase.rpc("set_company_logo", { p_path: path });
  if (error) {
    await admin.storage.from(LOGO_BUCKET).remove([path]);
    return errorState({}, {}, dbErrorCode(error));
  }

  if (member.company.logo_path) await admin.storage.from(LOGO_BUCKET).remove([member.company.logo_path]);
  refresh();
  return successState();
}

export async function removeCompanyLogo() {
  const member = await requireMember();
  if (!member?.company.logo_path) return;
  // Texto vacío = quitar el logo.
  const { error } = await member.supabase.rpc("set_company_logo", { p_path: "" });
  if (!error) await createAdminClient().storage.from(LOGO_BUCKET).remove([member.company.logo_path]);
  await flash("removed");
  refresh();
}

export async function addCompanySkill(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const member = await requireMember();
  const skillId = z.uuid().safeParse(values.skillId);
  if (!member) return errorState(values, {}, "unknown");
  if (!skillId.success) return errorState(values, { skillId: { code: "required" } });

  const { error } = await member.supabase.from("company_skills").insert({ company_id: member.company.id, skill_id: skillId.data });
  if (error) return errorState(values, {}, dbErrorCode(error));

  refresh();
  return successState();
}

export async function removeCompanySkill(formData: FormData) {
  const member = await requireMember();
  const skillId = z.uuid().safeParse(formData.get("skillId"));
  if (!member || !skillId.success) return;
  await member.supabase.from("company_skills").delete().eq("company_id", member.company.id).eq("skill_id", skillId.data);
  await flash("removed");
  refresh();
}

const COVER_BUCKET = "company-covers";

/** Portada de la empresa: el servidor la recodifica (1200×800) y la guarda; el cliente nunca escribe en Storage. */
export async function uploadCompanyCover(_prev: FormState, formData: FormData): Promise<FormState> {
  const member = await requireMember();
  if (!member) return errorState({}, {}, "unknown");

  const cover = await processCover(formData.get("cover"));
  if (!cover.ok) {
    return errorState({}, { cover: { code: "invalid" } }, cover.code === "file_too_large" ? "avatar_too_large" : cover.code);
  }

  const path = `${member.company.id}/${randomUUID().replaceAll("-", "")}.webp`;
  const admin = createAdminClient();
  const upload = await admin.storage.from(COVER_BUCKET).upload(path, cover.webp, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (upload.error) {
    console.error("No se pudo subir la portada", { message: upload.error.message });
    return errorState({}, {}, "unknown");
  }

  const { error } = await member.supabase.rpc("set_company_cover", { p_path: path });
  if (error) {
    await admin.storage.from(COVER_BUCKET).remove([path]);
    return errorState({}, {}, dbErrorCode(error));
  }

  if (member.company.cover_path) await admin.storage.from(COVER_BUCKET).remove([member.company.cover_path]);
  refresh();
  return successState();
}

export async function removeCompanyCover() {
  const member = await requireMember();
  if (!member?.company.cover_path) return;
  const { error } = await member.supabase.rpc("set_company_cover", { p_path: "" });
  if (!error) await createAdminClient().storage.from(COVER_BUCKET).remove([member.company.cover_path]);
  await flash("removed");
  refresh();
}
