/** Busca la imagen de vista previa (Open Graph / Twitter) en el HTML de una página. */
const PREVIEW_KEYS = ["og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src"];

function decode(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function findPreviewImage(html: string, pageUrl: string): string | null {
  const head = html.slice(0, 200_000);
  const found = new Map<string, string>();
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = new Map<string, string>();
    for (const m of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
      attrs.set(m[1]!.toLowerCase(), decode(m[2] ?? m[3] ?? m[4] ?? ""));
    }
    const key = (attrs.get("property") ?? attrs.get("name") ?? "").toLowerCase();
    const content = attrs.get("content");
    if (content && PREVIEW_KEYS.includes(key) && !found.has(key)) found.set(key, content.trim());
  }
  for (const key of PREVIEW_KEYS) {
    const value = found.get(key);
    if (!value) continue;
    try {
      const url = new URL(value, pageUrl);
      if (url.protocol === "https:") return url.toString();
    } catch {
      // URL inválida: se prueba la siguiente.
    }
  }
  return null;
}
