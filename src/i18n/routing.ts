import { defineRouting } from "next-intl/routing";

/**
 * Idiomas y rutas del sitio.
 *
 * Las claves de `pathnames` son las carpetas reales dentro de `app/[locale]` (en inglés),
 * y los valores son las URLs que ve cada idioma. Cada ruta nueva se agrega acá.
 */
export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "always",
  pathnames: {
    "/": "/",
    "/sign-in": { es: "/ingresar", en: "/sign-in" },
    "/welcome": { es: "/bienvenida", en: "/welcome" },
    "/profile": { es: "/perfil", en: "/profile" },
    "/p/[slug]": "/p/[slug]",
    "/dashboard": { es: "/panel", en: "/dashboard" },
    "/dashboard/company": { es: "/panel/empresa", en: "/dashboard/company" },
    "/companies/[slug]": { es: "/empresas/[slug]", en: "/companies/[slug]" },
  },
});

export type AppLocale = (typeof routing.locales)[number];
