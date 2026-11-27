import "server-only";
import sharp from "sharp";
import { LOGO_FORMATS, LOGO_MAX_BYTES } from "@/lib/validation/company";

export type LogoResult = { ok: true; webp: Buffer } | { ok: false; code: "required_file" | "file_too_large" | "file_type" };

/**
 * Recodifica un logo subido a WebP de 256×256 (OWASP: subida de archivos).
 * - El tipo se verifica por el contenido real (sharp lee el archivo), no por la extensión ni el MIME.
 * - SVG y GIF se rechazan: un SVG puede llevar scripts.
 * - La recodificación descarta metadatos (EXIF, ubicación) y neutraliza archivos "políglotas".
 */
export async function processLogo(file: FormDataEntryValue | null): Promise<LogoResult> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, code: "required_file" };
  if (file.size > LOGO_MAX_BYTES) return { ok: false, code: "file_too_large" };

  try {
    const input = Buffer.from(await file.arrayBuffer());
    // limitInputPixels evita "bombas de descompresión" (imágenes chicas en bytes y gigantes en píxeles).
    const image = sharp(input, { limitInputPixels: 25_000_000, failOn: "error" });
    const { format } = await image.metadata();
    if (!format || !(LOGO_FORMATS as readonly string[]).includes(format)) return { ok: false, code: "file_type" };

    const webp = await image
      .rotate()
      .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 85 })
      .toBuffer();
    return { ok: true, webp };
  } catch {
    return { ok: false, code: "file_type" };
  }
}
