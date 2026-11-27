"use server";

import { flash } from "@/lib/flash.server";
import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentRecruiter } from "@/lib/auth/recruiter";
import { dbErrorCode, errorState, type FieldError, type FormErrorCode, type FormState, formValues, successState, zodFieldErrors } from "@/lib/forms";
import { processCover, processLogo } from "@/lib/images";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { companyDetailsSchema, companyWebsiteSchema, industryFrom } from "@/lib/validation/company";
import { redirect } from "@/i18n/navigation";
import { parseLocale } from "@/i18n/locale";

const LOGO_BUCKET = "company-logos";
const COVER_BUCKET = "company-covers";

/** Solo miembros de una empresa activa. RLS lo vuelve a verificar en cada consulta. */
async function requireMember() {
  const recruiter = await getCurrentRecruiter();
  if (!recruiter || recruiter.company.status !== "active") return null;
  return { ...recruiter, supabase: await createClient() };
}

export async function updateCompanyDetails(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { ...formValues(formData), industry: industryFrom(formData.get("industryChoice"), formData.get("industryOther")) };
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

  const saved = await saveImage(member, "logo", logo.webp);
  if (saved !== "ok") return errorState({}, {}, saved);
  refresh();
  return successState();
}

type Member = NonNullable<Awaited<ReturnType<typeof requireMember>>>;

/**
 * Sube el logo o la portada ya recodificados y los deja como actuales (borra la versión anterior).
 * Nombre aleatorio: no se adivina y cada versión tiene su URL (sin problemas de caché).
 */
async function saveImage(member: Member, kind: "logo" | "cover", webp: Buffer): Promise<"ok" | FormErrorCode> {
  const bucket = kind === "logo" ? LOGO_BUCKET : COVER_BUCKET;
  const path = `${member.company.id}/${randomUUID().replaceAll("-", "")}.webp`;
  const admin = createAdminClient();
  const upload = await admin.storage.from(bucket).upload(path, webp, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (upload.error) {
    console.error(`No se pudo subir ${kind === "logo" ? "el logo" : "la portada"}`, { message: upload.error.message });
    return "unknown";
  }
  const { error } = await member.supabase.rpc(kind === "logo" ? "set_company_logo" : "set_company_cover", { p_path: path });
  if (error) {
    await admin.storage.from(bucket).remove([path]);
    return dbErrorCode(error);
  }
  const previous = kind === "logo" ? member.company.logo_path : member.company.cover_path;
  if (previous) await admin.storage.from(bucket).remove([previous]);
  return "ok";
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

/** Portada de la empresa: el servidor la recodifica (1200×800) y la guarda; el cliente nunca escribe en Storage. */
export async function uploadCompanyCover(_prev: FormState, formData: FormData): Promise<FormState> {
  const member = await requireMember();
  if (!member) return errorState({}, {}, "unknown");

  const cover = await processCover(formData.get("cover"));
  if (!cover.ok) {
    return errorState({}, { cover: { code: "invalid" } }, cover.code === "file_too_large" ? "avatar_too_large" : cover.code);
  }

  const saved = await saveImage(member, "cover", cover.webp);
  if (saved !== "ok") return errorState({}, {}, saved);
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

const hasFile = (value: FormDataEntryValue | null): value is File => value instanceof File && value.size > 0;

/**
 * Alta de la empresa en un solo envío: datos, sitio web, logo, portada y stack. Primero se valida
 * todo (también las imágenes); recién si está todo bien se guarda, así no queda un alta a medias.
 */
export async function completeCompanySetup(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { ...formValues(formData), industry: industryFrom(formData.get("industryChoice"), formData.get("industryOther")) };
  const member = await requireMember();
  if (!member) return errorState(values, {}, "unknown");
  const locale = parseLocale(formData.get("locale"));
  if (member.company.setup_completed_at) return redirect({ href: "/dashboard", locale });

  const fieldErrors: Record<string, FieldError> = {};
  const details = companyDetailsSchema.safeParse(values);
  if (!details.success) Object.assign(fieldErrors, zodFieldErrors(details.error));
  const website = companyWebsiteSchema.safeParse(values);
  if (!website.success) Object.assign(fieldErrors, zodFieldErrors(website.error));

  const logoFile = formData.get("logo");
  const coverFile = formData.get("cover");
  const logo = hasFile(logoFile) ? await processLogo(logoFile) : null;
  const cover = hasFile(coverFile) ? await processCover(coverFile) : null;
  let imageError: FormErrorCode | undefined;
  if (logo && !logo.ok) {
    fieldErrors.logo = { code: "invalid" };
    imageError = logo.code;
  }
  if (cover && !cover.ok) {
    fieldErrors.cover = { code: "invalid" };
    imageError ??= cover.code === "file_too_large" ? "avatar_too_large" : cover.code;
  }
  if (!details.success || !website.success || imageError) return errorState(values, fieldErrors, imageError);

  const d = details.data;
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

  const websiteResult = await member.supabase.rpc("update_company_website", { p_website_url: website.data.websiteUrl ?? "" });
  if (websiteResult.error) {
    if (websiteResult.error.message === "company_exists") return errorState(values, { websiteUrl: { code: "invalid" } }, "company_exists");
    return errorState(values, {}, dbErrorCode(websiteResult.error));
  }

  for (const [kind, image] of [["logo", logo], ["cover", cover]] as const) {
    if (!image?.ok) continue;
    const saved = await saveImage(member, kind, image.webp);
    if (saved !== "ok") return errorState(values, {}, saved);
  }

  const skillIds = [...new Set(formData.getAll("skillIds").map(String))].filter((id) => z.uuid().safeParse(id).success).slice(0, 20);
  if (skillIds.length > 0) {
    const { error: skillsError } = await member.supabase
      .from("company_skills")
      .upsert(skillIds.map((skill_id) => ({ company_id: member.company.id, skill_id })), { ignoreDuplicates: true });
    if (skillsError) return errorState(values, {}, dbErrorCode(skillsError));
  }

  const done = await member.supabase.rpc("complete_company_setup");
  if (done.error) return errorState(values, {}, dbErrorCode(done.error));

  await flash("companyReady");
  refresh();
  return redirect({ href: "/dashboard", locale });
}
