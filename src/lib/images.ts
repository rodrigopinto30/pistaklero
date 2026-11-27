import "server-only";
import sharp, { type Sharp } from "sharp";
import { LOGO_FORMATS, LOGO_MAX_BYTES } from "@/lib/validation/company";

export type ImageResult = { ok: true; webp: Buffer } | { ok: false; code: "required_file" | "file_too_large" | "file_type" };
export type LogoResult = ImageResult;

/** Formatos aceptados para fotos y logos: SVG y GIF quedan afuera (un SVG puede llevar scripts). */
export const IMAGE_FORMATS = LOGO_FORMATS;
/** Una foto sacada con el celular pesa varios MB: se acepta hasta 4 MB y se achica en el servidor. */
export const AVATAR_MAX_BYTES = 4_000_000;

/**
 * Recodifica una imagen subida a WebP (OWASP: subida de archivos).
 * - El tipo se verifica por el contenido real (sharp lee el archivo), no por la extensión ni el MIME.
 * - La recodificación descarta metadatos (EXIF, ubicación) y neutraliza archivos "políglotas".
 * - limitInputPixels evita "bombas de descompresión" (imágenes chicas en bytes y gigantes en píxeles).
 */
async function toWebp(
  file: FormDataEntryValue | null,
  maxBytes: number,
  resize: (image: Sharp) => Sharp
): Promise<ImageResult> {
  if (!(file instanceof File) || file.size === 0) return { ok: false, code: "required_file" };
  if (file.size > maxBytes) return { ok: false, code: "file_too_large" };
  return bufferToWebp(Buffer.from(await file.arrayBuffer()), resize);
}

async function bufferToWebp(input: Buffer, resize: (image: Sharp) => Sharp): Promise<ImageResult> {
  try {
    const image = sharp(input, { limitInputPixels: 25_000_000, failOn: "error" });
    const { format } = await image.metadata();
    if (!format || !(IMAGE_FORMATS as readonly string[]).includes(format)) return { ok: false, code: "file_type" };
    const webp = await resize(image.rotate()).webp({ quality: 85 }).toBuffer();
    return { ok: true, webp };
  } catch {
    return { ok: false, code: "file_type" };
  }
}

/** Logo de empresa: 256×256 sin recortar (fondo transparente). */
export function processLogo(file: FormDataEntryValue | null): Promise<ImageResult> {
  return toWebp(file, LOGO_MAX_BYTES, (image) =>
    image.resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  );
}

/** Foto de perfil: 256×256 recortada al centro, para mostrarla redonda. */
export function processAvatar(file: FormDataEntryValue | null): Promise<ImageResult> {
  return toWebp(file, AVATAR_MAX_BYTES, avatarResize);
}

/** La misma foto de perfil, a partir de una imagen ya descargada (la de Google o GitHub). */
export function avatarFromBuffer(input: Buffer): Promise<ImageResult> {
  return bufferToWebp(input, avatarResize);
}

const avatarResize = (image: Sharp) => image.resize(256, 256, { fit: "cover", position: "attention" });
