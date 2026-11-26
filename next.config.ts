import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
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
