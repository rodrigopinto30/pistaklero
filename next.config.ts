import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { getStaticSecurityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // El servidor de desarrollo escucha en "localhost" y el sitio se abre en 127.0.0.1:
  // sin esto Next bloquea la recarga en caliente por venir de otro origen.
  allowedDevOrigins: ["127.0.0.1"],
  // No anunciar el framework en cada respuesta.
  poweredByHeader: false,
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
