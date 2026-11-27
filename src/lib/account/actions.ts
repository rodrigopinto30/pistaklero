"use server";

import { refresh } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/session";
import { dbErrorCode, errorState, type FormState, formValues, successState, zodFieldErrors } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { personNameSchema } from "@/lib/validation/person";
import { AVATAR_BUCKET, newAvatarPath } from "./avatar";
import { processAvatar } from "@/lib/images";
import { createAdminClient } from "@/lib/supabase/admin";

/** Nombre, segundo nombre y apellido de la cuenta actual (cualquier rol). */
export async function savePersonalData(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const profile = await getCurrentProfile();
  if (!profile || profile.suspended_at) return errorState(values, {}, "unknown");

  const parsed = personNameSchema.safeParse(values);
  if (!parsed.success) return errorState(values, zodFieldErrors(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_my_name", {
    p_first_name: parsed.data.firstName,
    p_middle_name: parsed.data.middleName,
    p_last_name: parsed.data.lastName,
  });
  if (error) return errorState(values, {}, dbErrorCode(error));

  refresh();
  return successState();
}

/** Sube la foto de perfil: el servidor la recodifica y la guarda; el cliente nunca escribe en Storage. */
export async function uploadAvatar(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.suspended_at) return errorState({}, {}, "unknown");

  const avatar = await processAvatar(formData.get("avatar"));
  if (!avatar.ok) {
    return errorState({}, { avatar: { code: "invalid" } }, avatar.code === "file_too_large" ? "avatar_too_large" : avatar.code);
  }

  const supabase = await createClient();
  const { data: person } = await supabase.from("people").select("avatar_path").eq("user_id", profile.id).maybeSingle();
  const path = newAvatarPath(profile.id);
  const admin = createAdminClient();
  const upload = await admin.storage
    .from(AVATAR_BUCKET)
    .upload(path, avatar.webp, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (upload.error) {
    console.error("No se pudo subir la foto de perfil", { message: upload.error.message });
    return errorState({}, {}, "unknown");
  }

  const { error } = await supabase.rpc("set_my_avatar", { p_path: path });
  if (error) {
    await admin.storage.from(AVATAR_BUCKET).remove([path]);
    return errorState({}, {}, dbErrorCode(error));
  }

  if (person?.avatar_path) await admin.storage.from(AVATAR_BUCKET).remove([person.avatar_path]);
  refresh();
  return successState();
}

export async function removeAvatar() {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const supabase = await createClient();
  const { data: person } = await supabase.from("people").select("avatar_path").eq("user_id", profile.id).maybeSingle();
  if (!person?.avatar_path) return;
  // Texto vacío = quitar la foto.
  const { error } = await supabase.rpc("set_my_avatar", { p_path: "" });
  if (!error) await createAdminClient().storage.from(AVATAR_BUCKET).remove([person.avatar_path]);
  refresh();
}
