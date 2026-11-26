import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/*
 * Detecta el idioma (cookie o Accept-Language), redirige `/` a `/es` o `/en`,
 * traduce las URLs y agrega las cabeceras `Link` con hreflang para los buscadores.
 */
export default createMiddleware(routing);

export const config = {
  // Todo menos la API, los internos de Next/Vercel y los archivos con extensión (favicon, imágenes…).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
