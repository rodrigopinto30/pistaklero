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
    "/forgot-password": { es: "/recuperar-contrasena", en: "/forgot-password" },
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
    "/saved": { es: "/guardados", en: "/saved" },
    "/notifications": { es: "/notificaciones", en: "/notifications" },
    "/talent": { es: "/talento", en: "/talent" },
    "/admin": "/admin",
    "/settings": { es: "/ajustes", en: "/settings" },
    "/legal/terms": { es: "/legal/terminos", en: "/legal/terms" },
    "/legal/privacy": { es: "/legal/privacidad", en: "/legal/privacy" },
    "/accessibility": { es: "/accesibilidad", en: "/accessibility" },
    "/admin/import": { es: "/admin/importar", en: "/admin/import" },
    "/invitation": { es: "/invitacion", en: "/invitation" },
    "/companies": { es: "/empresas", en: "/companies" },
    "/companies/[slug]": { es: "/empresas/[slug]", en: "/companies/[slug]" },
    "/posts": { es: "/publicaciones", en: "/posts" },
    "/posts/new": { es: "/publicaciones/nueva", en: "/posts/new" },
    "/posts/[slug]": { es: "/publicaciones/[slug]", en: "/posts/[slug]" },
    "/posts/[slug]/edit": { es: "/publicaciones/[slug]/editar", en: "/posts/[slug]/edit" },
    "/my-posts": { es: "/mis-publicaciones", en: "/my-posts" },
  },
});

export type AppLocale = (typeof routing.locales)[number];
