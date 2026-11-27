import "server-only";
import type { FormErrorCode } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET, newAvatarPath } from "./avatar";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Guarda una foto de perfil ya recodificada (WebP) como la actual y borra la anterior.
 * El cliente nunca escribe en Storage: lo hace el servidor, después de validar la imagen.
 */
export async function storeAvatar(supabase: Supabase, userId: string, webp: Buffer): Promise<"ok" | FormErrorCode> {
  const { data: person } = await supabase.from("people").select("avatar_path").eq("user_id", userId).maybeSingle();
  const path = newAvatarPath(userId);
  const admin = createAdminClient();
  const upload = await admin.storage.from(AVATAR_BUCKET).upload(path, webp, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (upload.error) {
    console.error("No se pudo subir la foto de perfil", { message: upload.error.message });
    return "unknown";
  }
  const { error } = await supabase.rpc("set_my_avatar", { p_path: path });
  if (error) {
    await admin.storage.from(AVATAR_BUCKET).remove([path]);
    return "unknown";
  }
  if (person?.avatar_path) await admin.storage.from(AVATAR_BUCKET).remove([person.avatar_path]);
  return "ok";
}
