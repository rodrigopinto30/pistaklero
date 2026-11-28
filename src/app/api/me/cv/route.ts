import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { loadCvFonts } from "@/lib/cv/fonts";
import { type CvData, renderCv } from "@/lib/cv/render";
import { countryName, formatMonth } from "@/lib/geo";
import { plainForPdf } from "@/lib/editor/text";
import { createClient } from "@/lib/supabase/server";
import { parseLocale } from "@/i18n/locale";

/**
 * El CV de la candidata en formato Harvard (PDF). Solo para su propia cuenta.
 * ?view=1 lo abre en el navegador (vista previa); si no, se descarga.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const profile = await getCurrentProfile();
  if (profile?.role !== "candidate") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const locale = parseLocale(params.get("lang") ?? profile.locale);
  const inline = params.get("view") === "1";
  const t = await getTranslations({ locale, namespace: "Cv" });
  const supabase = await createClient();
  const [candidate, experiences, education, projects, certifications, skills] = await Promise.all([
    supabase.from("candidates").select("*, people(full_name)").eq("user_id", user.id).single(),
    supabase.from("candidate_experiences").select("*").eq("candidate_id", user.id).order("start_date", { ascending: false }),
    supabase.from("candidate_education").select("*").eq("candidate_id", user.id).order("start_date", { ascending: false }),
    supabase.from("candidate_projects").select("*").eq("candidate_id", user.id).order("created_at", { ascending: false }),
    supabase.from("candidate_certifications").select("*").eq("candidate_id", user.id).order("issued_on", { ascending: false, nullsFirst: false }),
    supabase.from("candidate_skills").select("level, skills(name_es, name_en)").eq("candidate_id", user.id),
  ]);
  const c = candidate.data;
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const period = (start: string, end: string | null) => `${formatMonth(start, locale)} – ${end ? formatMonth(end, locale) : t("present")}`;
  const languageNames = new Intl.DisplayNames([locale], { type: "language" });
  const data: CvData = {
    fullName: c.people?.full_name ?? "",
    headline: c.headline,
    bio: plainForPdf(c.bio),
    location: [c.city, countryName(c.country, locale)].filter(Boolean).join(", ") || null,
    email: user.email ?? null,
    links: [c.website_url, c.linkedin_url, c.github_url].filter((url): url is string => Boolean(url)),
    languages: c.languages.map((code) => languageNames.of(code) ?? code),
    skills: (skills.data ?? []).map((s) => (locale === "en" ? s.skills?.name_en : s.skills?.name_es)).filter((name): name is string => Boolean(name)),
    experiences: (experiences.data ?? []).map((e) => ({ title: e.title, company: e.company_name, period: period(e.start_date, e.end_date), description: plainForPdf(e.description) })),
    education: (education.data ?? []).map((e) => ({ degree: e.degree, institution: e.institution, period: period(e.start_date, e.end_date) })),
    projects: (projects.data ?? []).map((p) => ({
      title: p.title,
      links: [p.url, p.repo_url].filter((url): url is string => Boolean(url)),
      description: plainForPdf(p.description),
    })),
    certifications: (certifications.data ?? []).map((cert) => ({
      name: cert.name,
      detail: [cert.issuer, cert.issued_on ? formatMonth(cert.issued_on, locale) : null].filter(Boolean).join(" · "),
      url: cert.credential_url,
    })),
  };

  const pdf = await renderCv(
    data,
    {
      about: t("about"),
      experience: t("experience"),
      education: t("education"),
      projects: t("projects"),
      certifications: t("certifications"),
      skills: t("skills"),
      languages: t("languages"),
      skillsSection: t("skillsSection"),
    },
    locale,
    await loadCvFonts()
  );

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="cv-harvard-${c.slug}.pdf"`,
      // Datos personales: que no los guarde ninguna caché intermedia.
      "Cache-Control": "no-store",
    },
  });
}
