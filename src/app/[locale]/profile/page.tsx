import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Download, Eye } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { countryOptions, formatMonth, languageOptions } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";
import { getPathname, Link, redirect } from "@/i18n/navigation";
import { AvatarForm } from "@/components/account/avatar-form";
import { PersonalForm } from "@/components/account/personal-form";
import { BasicsForm } from "./_components/basics-form";
import { BlockedCompanies } from "./_components/blocked-companies";
import { EntriesSection, type EntryItem } from "./_components/entries-section";
import { PreferencesForm } from "./_components/preferences-form";
import { SalaryForm } from "./_components/salary-form";
import { SectionCard as Section } from "@/components/section-card";
import { SkillsSection } from "./_components/skills-section";
import { Emoji } from "@/components/emoji";
import { avatarUrl } from "@/lib/storage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Profile");
  return { title: t("metaTitle"), robots: { index: false } };
}

/** "2024-03-01" → "2024-03" para <input type="month">. */
const toMonth = (date: string | null) => (date ? date.slice(0, 7) : "");

export default async function ProfilePage() {
  const locale = await getLocale();
  if (!(await getCurrentUser())) {
    redirect({ href: { pathname: "/sign-in", query: { next: getPathname({ locale, href: "/profile" }) } }, locale });
  }
  const profile = await getCurrentProfile();
  if (!profile) redirect({ href: "/welcome", locale });
  if (profile?.role !== "candidate") redirect({ href: "/", locale });
  const userId = profile!.id;

  const supabase = await createClient();
  const [person, candidate, catalog, skills, experiences, education, certifications, projects, salary, blocked] = await Promise.all([
    supabase.from("people").select("first_name, middle_name, last_name, full_name, avatar_path").eq("user_id", userId).single(),
    supabase.from("candidates").select("*").eq("user_id", userId).single(),
    supabase.from("skills").select("id, name_es, name_en, category").order("slug"),
    supabase.from("candidate_skills").select("skill_id, level, skills(name_es, name_en)").eq("candidate_id", userId),
    supabase.from("candidate_experiences").select("*").eq("candidate_id", userId).order("start_date", { ascending: false }),
    supabase.from("candidate_education").select("*").eq("candidate_id", userId).order("start_date", { ascending: false }),
    supabase.from("candidate_certifications").select("*").eq("candidate_id", userId).order("issued_on", { ascending: false, nullsFirst: false }),
    supabase.from("candidate_projects").select("*").eq("candidate_id", userId).order("created_at", { ascending: false }),
    supabase.from("candidate_salary_expectations").select("*").eq("candidate_id", userId).maybeSingle(),
    supabase.from("candidate_blocked_companies").select("company_id, companies(name)").eq("candidate_id", userId),
  ]);

  const t = await getTranslations("Profile");
  const c = candidate.data!;
  const skillName = (s: { name_es: string; name_en: string } | null) => (locale === "en" ? s?.name_en : s?.name_es) ?? "";
  const period = (start: string | null, end: string | null) =>
    start ? `${formatMonth(start, locale)} – ${end ? formatMonth(end, locale) : t("entries.present")}` : null;

  const entries: Record<"experience" | "education" | "certification" | "project", EntryItem[]> = {
    experience: (experiences.data ?? []).map((e) => ({
      id: e.id,
      heading: e.title,
      subheading: e.company_name,
      period: period(e.start_date, e.end_date),
      values: { title: e.title, companyName: e.company_name, startDate: toMonth(e.start_date), endDate: toMonth(e.end_date), description: e.description },
    })),
    education: (education.data ?? []).map((e) => ({
      id: e.id,
      heading: e.degree,
      subheading: e.institution,
      period: period(e.start_date, e.end_date),
      values: { degree: e.degree, institution: e.institution, startDate: toMonth(e.start_date), endDate: toMonth(e.end_date) },
    })),
    certification: (certifications.data ?? []).map((e) => ({
      id: e.id,
      heading: e.name,
      subheading: e.issuer,
      period: formatMonth(e.issued_on, locale),
      values: { name: e.name, issuer: e.issuer, issuedOn: toMonth(e.issued_on), credentialUrl: e.credential_url ?? "" },
    })),
    project: (projects.data ?? []).map((e) => ({
      id: e.id,
      heading: e.title,
      subheading: e.description,
      period: null,
      values: { title: e.title, description: e.description, url: e.url ?? "", repoUrl: e.repo_url ?? "" },
    })),
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")} <Emoji symbol="🙋" /></h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Descarga directa (no es una página): la ruta arma el PDF con el perfil guardado. */}
          <a href={`/api/me/cv?lang=${locale}`} download className={buttonVariants({ variant: "outline" })}>
            <Download aria-hidden="true" />
            {t("downloadCv")}
          </a>
          <Link href={{ pathname: "/p/[slug]", params: { slug: c.slug } }} className={buttonVariants({ variant: "outline" })}>
            <Eye aria-hidden="true" />
            {t("viewPublic")}
          </Link>
        </div>
      </div>

      {/* Dos columnas que crecen por separado: el contenido principal a la izquierda y las preferencias a la derecha. */}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Section id="person" className="lg:col-span-3" title={t("person.title")} description={t("person.hint")}>
          <AvatarForm photoUrl={avatarUrl(person.data?.avatar_path)} name={person.data?.full_name ?? ""} />
          <PersonalForm
            saved={{
              firstName: person.data?.first_name ?? "",
              middleName: person.data?.middle_name ?? "",
              lastName: person.data?.last_name ?? "",
            }}
          />
        </Section>
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Section id="basics" title={t("basics.title")}>
            <BasicsForm
              saved={{
                headline: c.headline,
                bio: c.bio,
                country: c.country ?? "",
                city: c.city ?? "",
                languages: c.languages,
                githubUrl: c.github_url ?? "",
                linkedinUrl: c.linkedin_url ?? "",
                websiteUrl: c.website_url ?? "",
              }}
              countries={countryOptions(locale)}
              languages={languageOptions(locale)}
            />
          </Section>
          <Section id="skills" title={t("skills.title")}>
            <SkillsSection
              catalog={(catalog.data ?? []).map((s) => ({ id: s.id, name: skillName(s), category: s.category }))}
              selected={(skills.data ?? []).map((s) => ({ skillId: s.skill_id, name: skillName(s.skills), level: s.level }))}
            />
          </Section>
          <Section id="projects" title={t("entries.project.title")}>
            <EntriesSection block="project" entries={entries.project} />
          </Section>
          <Section id="experience" title={t("entries.experience.title")}>
            <EntriesSection block="experience" entries={entries.experience} />
          </Section>
          <Section id="education" title={t("entries.education.title")}>
            <EntriesSection block="education" entries={entries.education} />
          </Section>
          <Section id="certifications" title={t("entries.certification.title")}>
            <EntriesSection block="certification" entries={entries.certification} />
          </Section>
        </div>
        <div className="flex flex-col gap-6">
          <Section id="preferences" title={t("preferences.title")}>
            <PreferencesForm availability={c.availability} visibility={c.visibility} />
          </Section>
          <Section id="salary" title={t("salary.title")} description={t("salary.hint")}>
            <SalaryForm
              saved={
                salary.data
                  ? {
                      amount: String(salary.data.amount),
                      currency: salary.data.currency,
                      period: salary.data.period,
                      basis: salary.data.basis,
                      salaryVisibility: salary.data.visibility,
                    }
                  : null
              }
            />
          </Section>
          <Section id="blocked" title={t("blocked.title")} description={t("blocked.hint")}>
            <BlockedCompanies
              blocked={(blocked.data ?? []).map((b) => ({ id: b.company_id, name: b.companies?.name ?? "" }))}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
