import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { getPublicEnv } from "./lib/env";
import { buildContentSecurityPolicy, createNonce } from "./lib/security/headers";
import { refreshSession } from "./lib/supabase/proxy";

/*
 * next-intl detecta el idioma (cookie o Accept-Language), redirige `/` a `/es` o `/en`,
 * traduce las URLs y agrega las cabeceras `Link` con hreflang para los buscadores.
 */
const handleI18nRouting = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const supabaseOrigin = new URL(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL).origin;
  const nonce = createNonce();
  const csp = buildContentSecurityPolicy({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    connectSrc: [supabaseOrigin],
    // Logos, fotos de perfil y vistas previas se sirven desde nuestro Storage.
    imgSrc: [supabaseOrigin],
  });

  // 1. Renueva la sesión antes de renderizar (actualiza las cookies del pedido).
  const applySession = await refreshSession(request);

  // 2. Next lee la CSP del pedido para poner el nonce en sus propios <script>.
  //    next-intl copia estas cabeceras (y las cookies renovadas) al reenviar el pedido.
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", csp);
  const response = handleI18nRouting(request);

  // 3. La respuesta lleva la CSP y las cookies de sesión nuevas.
  response.headers.set("Content-Security-Policy", csp);
  return applySession(response);
}

export const config = {
  // Todo menos la API, los internos de Next/Vercel y los archivos con extensión (favicon, imágenes…).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
