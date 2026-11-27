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
    "/sign-up": { es: "/registro", en: "/sign-up" },
    "/welcome": { es: "/bienvenida", en: "/welcome" },
    "/profile": { es: "/perfil", en: "/profile" },
    "/p/[slug]": "/p/[slug]",
    "/dashboard": { es: "/panel", en: "/dashboard" },
    "/dashboard/company": { es: "/panel/empresa", en: "/dashboard/company" },
    "/dashboard/team": { es: "/panel/equipo", en: "/dashboard/team" },
    "/dashboard/jobs/new": { es: "/panel/ofertas/nueva", en: "/dashboard/jobs/new" },
    "/dashboard/jobs/[id]": { es: "/panel/ofertas/[id]", en: "/dashboard/jobs/[id]" },
    "/dashboard/jobs/[id]/applicants": { es: "/panel/ofertas/[id]/postulantes", en: "/dashboard/jobs/[id]/applicants" },
    "/jobs/[slug]": { es: "/empleos/[slug]", en: "/jobs/[slug]" },
    "/my-applications": { es: "/mis-postulaciones", en: "/my-applications" },
    "/admin": "/admin",
    "/settings": { es: "/ajustes", en: "/settings" },
    "/legal/terms": { es: "/legal/terminos", en: "/legal/terms" },
    "/legal/privacy": { es: "/legal/privacidad", en: "/legal/privacy" },
    "/accessibility": { es: "/accesibilidad", en: "/accessibility" },
    "/admin/import": { es: "/admin/importar", en: "/admin/import" },
    "/invitation": { es: "/invitacion", en: "/invitation" },
    "/companies/[slug]": { es: "/empresas/[slug]", en: "/companies/[slug]" },
  },
});

export type AppLocale = (typeof routing.locales)[number];
