const PLACEHOLDER_ORIGIN = "http://placeholder.invalid";

/**
 * Devuelve `value` solo si es una ruta relativa de este sitio; si no, `fallback`.
 * Evita redirecciones abiertas (OWASP A01): `?next=https://phishing.com` o `//phishing.com` no pasan.
 */
export function safeNextPath(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  // Barras invertidas y caracteres de control: algunos navegadores los interpretan como "//".
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;

  try {
    const url = new URL(value, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
