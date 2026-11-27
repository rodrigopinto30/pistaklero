import "server-only";
import { getTranslations } from "next-intl/server";
import { countryOptions } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES = ["language", "framework", "tool", "data", "design", "marketing", "soft"] as const;

/** Países y tecnologías agrupadas para el formulario de ofertas. */
export async function loadJobFormOptions(locale: string) {
  const supabase = await createClient();
  const tSkills = await getTranslations("Profile.skills");
  const { data: skills } = await supabase.from("skills").select("id, slug, name_es, name_en, category").order("slug");
  const skillGroups = CATEGORIES.map((category) => ({
    category,
    label: tSkills(`categories.${category}`),
    skills: (skills ?? [])
      .filter((s) => s.category === category)
      .map((s) => ({ id: s.id, name: locale === "en" ? s.name_en : s.name_es })),
  })).filter((g) => g.skills.length > 0);
  const skillIdsBySlug = new Map((skills ?? []).map((s) => [s.slug as string, s.id]));
  return { countries: countryOptions(locale), skillGroups, skillIdsBySlug };
}
