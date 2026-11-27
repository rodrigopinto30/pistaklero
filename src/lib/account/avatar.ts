import "server-only";
import { randomUUID } from "node:crypto";
import { avatarFromBuffer } from "@/lib/images";
import { SafeFetchFailure, safeGet } from "@/lib/security/safe-fetch";
import { createAdminClient } from "@/lib/supabase/admin";

export const AVATAR_BUCKET = "avatars";

/** Ruta nueva y aleatoria dentro de la carpeta de la persona: cada versión tiene su URL (sin problemas de caché). */
export function newAvatarPath(userId: string) {
  return `${userId}/${randomUUID().replaceAll("-", "")}.webp`;
}

/**
 * Trae la foto de Google o GitHub y la guarda como las demás (WebP 256×256, en nuestro Storage).
 * Corre después de responder (after()): si falla, la persona queda sin foto y puede subir una.
 */
export async function importAvatarFromProvider(userId: string, url: string) {
  try {
    const image = await safeGet(url, { maxBytes: 2_000_000, timeoutMs: 5_000, accept: "image/webp,image/png,image/jpeg" });
    if (!/^image\//i.test(image.contentType) || /svg/i.test(image.contentType)) return;
    const avatar = await avatarFromBuffer(image.body);
    if (!avatar.ok) return;

    const admin = createAdminClient();
    const path = newAvatarPath(userId);
    const upload = await admin.storage.from(AVATAR_BUCKET).upload(path, avatar.webp, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (upload.error) return;
    // Solo si todavía no eligió una foto propia.
    const { data } = await admin.from("people").update({ avatar_path: path }).eq("user_id", userId).is("avatar_path", null).select("user_id");
    if (!data?.length) await admin.storage.from(AVATAR_BUCKET).remove([path]);
  } catch (error) {
    if (!(error instanceof SafeFetchFailure)) console.error("No se pudo importar la foto del proveedor", { message: (error as Error).message });
  }
}
