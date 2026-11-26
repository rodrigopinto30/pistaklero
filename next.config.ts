import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { getStaticSecurityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
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
