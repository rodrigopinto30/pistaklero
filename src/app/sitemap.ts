import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getPublicEnv } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Href = Parameters<typeof getPathname>[0]["href"];

/** Cada página aparece una vez por idioma, con sus versiones alternativas (hreflang). */
function entry(base: string, href: Href, lastModified?: string): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(routing.locales.map((locale) => [locale, `${base}${getPathname({ locale, href })}`]));
  return routing.locales.map((locale) => ({
    url: languages[locale]!,
    lastModified,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Las ofertas cambian todo el tiempo: se arma en cada pedido.
  await connection();
  const base = getPublicEnv().NEXT_PUBLIC_SITE_URL;
  const supabase = createPublicClient();

  const [{ data: jobs }, { data: companies }, { data: profiles }, { data: posts }] = await Promise.all([
    // Solo ofertas nativas: las importadas no se indexan (contenido de terceros).
    supabase.from("jobs").select("slug, updated_at").eq("source", "native").eq("status", "published").gt("valid_through", new Date().toISOString()).limit(5000),
    supabase.from("companies").select("slug, updated_at").eq("status", "active").limit(5000),
    // RLS devuelve solo los perfiles públicos a un visitante anónimo.
    supabase.from("candidates").select("slug, updated_at").eq("visibility", "public").limit(5000),
    supabase.from("posts").select("slug, updated_at").eq("status", "published").limit(5000),
  ]);

  return [
    ...entry(base, "/"),
    ...entry(base, "/legal/terms"),
    ...entry(base, "/legal/privacy"),
    ...entry(base, "/accessibility"),
    ...entry(base, "/posts"),
    ...(jobs ?? []).flatMap((j) => entry(base, { pathname: "/jobs/[slug]", params: { slug: j.slug } }, j.updated_at)),
    ...(companies ?? []).flatMap((c) => entry(base, { pathname: "/companies/[slug]", params: { slug: c.slug } }, c.updated_at)),
    ...(profiles ?? []).flatMap((p) => entry(base, { pathname: "/p/[slug]", params: { slug: p.slug } }, p.updated_at)),
    ...(posts ?? []).flatMap((p) => entry(base, { pathname: "/posts/[slug]", params: { slug: p.slug } }, p.updated_at)),
  ];
}
