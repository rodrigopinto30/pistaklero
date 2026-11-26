import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { buildContentSecurityPolicy, createNonce } from "./lib/security/headers";

/*
 * next-intl detecta el idioma (cookie o Accept-Language), redirige `/` a `/es` o `/en`,
 * traduce las URLs y agrega las cabeceras `Link` con hreflang para los buscadores.
 */
const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy({
    nonce,
    isDev: process.env.NODE_ENV === "development",
  });

  // Next lee la CSP del pedido para poner el nonce en sus propios <script>.
  // next-intl copia estas cabeceras al reenviar el pedido.
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", csp);

  const response = handleI18nRouting(request);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Todo menos la API, los internos de Next/Vercel y los archivos con extensión (favicon, imágenes…).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
