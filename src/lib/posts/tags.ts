/** Etiquetas de publicaciones: las mismas reglas que la base (normalize_post_tag / valid_post_tags). */
export const MAX_TAGS = 30;
const TAG = /^[a-z0-9áéíóúüñç+#._-]{1,30}$/;

/** "#Python " → "python". null si no sirve como etiqueta. */
export function normalizeTag(raw: string): string | null {
  const tag = raw.trim().toLowerCase().replace(/^#+/, "").slice(0, 30);
  return TAG.test(tag) ? tag : null;
}
