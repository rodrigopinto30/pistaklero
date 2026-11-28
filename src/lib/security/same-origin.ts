import type { NextRequest } from "next/server";

/**
 * ¿El pedido viene de una página de este mismo sitio? Para las rutas que escriben algo con la
 * sesión de la persona (OWASP: CSRF). Los navegadores mandan Sec-Fetch-Site; si falta, se compara
 * el Origin con el del sitio. Las cookies de sesión además son SameSite=Lax.
 */
export function isSameOrigin(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null) return site === "same-origin";
  const origin = request.headers.get("origin");
  return origin !== null && origin === request.nextUrl.origin;
}
