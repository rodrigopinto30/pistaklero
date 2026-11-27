import type { MetadataRoute } from "next";
import { getPublicEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = getPublicEnv().NEXT_PUBLIC_SITE_URL;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Las páginas privadas igual llevan noindex; esto ahorra el rastreo.
      disallow: ["/api/", "/es/panel", "/en/dashboard", "/es/admin", "/en/admin", "/es/ajustes", "/en/settings", "/es/ingresar", "/en/sign-in", "/es/registro", "/en/sign-up", "/es/guardados", "/en/saved"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
