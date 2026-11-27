import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { getStaticSecurityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // El servidor de desarrollo escucha en "localhost" y el sitio se abre en 127.0.0.1:
  // sin esto Next bloquea la recarga en caliente por venir de otro origen.
  allowedDevOrigins: ["127.0.0.1"],
  // No anunciar el framework en cada respuesta.
  poweredByHeader: false,
  // La fuente del CV en PDF se lee del disco: hay que incluirla en la función que lo genera.
  outputFileTracingIncludes: {
    "/api/me/cv": ["./node_modules/geist/dist/fonts/geist-sans/Geist-{Regular,SemiBold}.ttf"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getStaticSecurityHeaders({
          isProduction: process.env.NODE_ENV === "production",
        }),
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Las fotos de perfil sacadas con el celular pesan varios MB (se aceptan hasta 4 MB y se achican).
    // Vercel corta igual los pedidos de más de 4,5 MB.
    serverActions: { bodySizeLimit: "5mb" },
    // Todas las páginas se renderizan por pedido (CSP con nonce): validar la navegación instantánea
    // de cada página solo genera ruido. Se valida únicamente donde se exporte `instant`.
    instantInsights: {
      validationLevel: "manual-warning",
    },
    // 404 para URLs inexistentes (app/global-not-found.tsx): hace falta porque el layout raíz está en [locale].
    globalNotFound: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Usa src/i18n/request.ts para cargar las traducciones de cada pedido.
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
