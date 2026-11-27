import "server-only";
import sharp from "sharp";
import { SafeFetchFailure, safeGet } from "@/lib/security/safe-fetch";
import { createAdminClient } from "@/lib/supabase/admin";
import { findPreviewImage } from "./og-image";

const BUCKET = "project-previews";
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif"]);

/** Baja la imagen de vista previa del enlace y la recodifica a WebP de 1200×630 (sin metadatos). */
async function buildPreview(projectUrl: string) {
  const page = await safeGet(projectUrl, { maxBytes: 2_000_000, timeoutMs: 5_000, accept: "text/html,application/xhtml+xml" });
  if (!/^text\/html|application\/xhtml\+xml/i.test(page.contentType)) return null;
  const imageUrl = findPreviewImage(page.body.toString("utf8"), page.url);
  if (!imageUrl) return null;

  const image = await safeGet(imageUrl, { maxBytes: 2_000_000, timeoutMs: 5_000, accept: "image/avif,image/webp,image/png,image/jpeg,image/gif" });
  // SVG no: puede traer scripts o referencias externas. Y se confía en el contenido, no en la cabecera.
  if (!/^image\//i.test(image.contentType) || /svg/i.test(image.contentType)) return null;
  const input = sharp(image.body, { limitInputPixels: 40_000_000, animated: false });
  const { format } = await input.metadata();
  if (!format || !ALLOWED_FORMATS.has(format)) return null;
  return input.rotate().resize(1200, 630, { fit: "cover" }).webp({ quality: 80 }).toBuffer();
}

/**
 * Actualiza la vista previa de un proyecto. Corre después de responder (after()), así que nunca falla
 * hacia la persona: si el enlace no tiene imagen o no se puede bajar, el proyecto queda sin vista previa.
 */
export async function refreshProjectPreview(projectId: string, candidateId: string, url: string | null) {
  const admin = createAdminClient();
  const { data: project } = await admin.from("candidate_projects").select("preview_path").eq("id", projectId).eq("candidate_id", candidateId).maybeSingle();
  if (!project) return;

  let preview: Buffer | null = null;
  if (url) {
    try {
      preview = await buildPreview(url);
    } catch (error) {
      if (!(error instanceof SafeFetchFailure)) console.error("La vista previa falló", { projectId, message: (error as Error).message });
    }
  }

  let path: string | null = null;
  if (preview) {
    // Nombre nuevo en cada cambio: las cachés no muestran la imagen vieja.
    path = `${candidateId}/${projectId}-${Date.now().toString(36)}.webp`;
    const { error } = await admin.storage.from(BUCKET).upload(path, preview, { contentType: "image/webp", upsert: false });
    if (error) path = null;
  }

  await admin.from("candidate_projects").update({ preview_path: path }).eq("id", projectId);
  if (project.preview_path && project.preview_path !== path) await admin.storage.from(BUCKET).remove([project.preview_path]);
}

export async function removeProjectPreview(path: string | null) {
  if (path) await createAdminClient().storage.from(BUCKET).remove([path]);
}
