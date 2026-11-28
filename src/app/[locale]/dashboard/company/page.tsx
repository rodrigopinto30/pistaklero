import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { SectionCard } from "@/components/section-card";
import { buttonVariants } from "@/components/ui/button";
import { requireRecruiterPage } from "@/lib/auth/guards";
import { countryOptions } from "@/lib/geo";
import { companyCoverUrl, companyLogoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { CompanySetupForm } from "./_components/company-setup-form";
import { DetailsForm } from "./_components/details-form";
import { LogoForm } from "./_components/logo-form";
import { CoverForm } from "./_components/cover-form";
import { StackSection } from "./_components/stack-section";
import { WebsiteForm } from "./_components/website-form";
import { Emoji } from "@/components/emoji";
import { BackLink } from "@/components/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Company");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function CompanyEditPage() {
  const locale = (await getLocale()) as AppLocale;
  const { company: c } = await requireRecruiterPage(locale, "/dashboard/company");
  const t = await getTranslations("Company");

  const supabase = await createClient();
  const [catalog, stack] = await Promise.all([
    supabase.from("skills").select("id, name_es, name_en").in("category", ["language", "framework", "tool", "data", "design"]).order("slug"),
    supabase.from("company_skills").select("skill_id, skills(name_es, name_en)").eq("company_id", c.id),
  ]);
  const name = (s: { name_es: string; name_en: string } | null) => (locale === "en" ? s?.name_en : s?.name_es) ?? "";

  const countries = countryOptions(locale);
  const catalogOptions = (catalog.data ?? []).map((s) => ({ id: s.id, name: name(s) }));
  const details = {
    name: c.name,
    description: c.description,
    industry: c.industry ?? "",
    size: c.size ?? "",
    stage: c.stage ?? "",
    country: c.country ?? "",
    city: c.city ?? "",
    linkedinUrl: c.linkedin_url ?? "",
    xUrl: c.x_url ?? "",
    instagramUrl: c.instagram_url ?? "",
  };

  // Recién creada: un solo formulario y un solo "Finalizar registro".
  if (!c.setup_completed_at) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <BackLink fallback="/dashboard" />
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("setup.title")} <Emoji symbol="🏢" />
          </h1>
          <p className="text-muted-foreground">{t("setup.subtitle")}</p>
        </div>
        <CompanySetupForm locale={locale} saved={{ ...details, websiteUrl: c.website_url ?? "" }} countries={countries} catalog={catalogOptions} />
      </div>
    );
  }

  // Ya armada: cada sección se guarda por separado, una debajo de la otra.
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <BackLink fallback="/dashboard" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")} <Emoji symbol="🏢" /></h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href={{ pathname: "/companies/[slug]", params: { slug: c.slug } }} className={buttonVariants({ variant: "outline" })}>
          {t("viewPublic")}
        </Link>
      </div>
      <SectionCard id="logo" title={t("logo.title")}>
        <LogoForm logoUrl={companyLogoUrl(c.logo_path)} />
      </SectionCard>
      <SectionCard id="cover" title={t("cover.title")}>
        <CoverForm coverUrl={companyCoverUrl(c.cover_path)} />
      </SectionCard>
      <SectionCard id="details" title={t("details.title")}>
        <DetailsForm saved={details} countries={countries} />
      </SectionCard>
      <SectionCard id="website" title={t("website.title")}>
        <WebsiteForm websiteUrl={c.website_url ?? ""} domain={c.domain} verified={Boolean(c.verified_at)} />
      </SectionCard>
      <SectionCard id="stack" title={t("stack.title")} description={t("stack.hint")}>
        <StackSection catalog={catalogOptions} selected={(stack.data ?? []).map((s) => ({ id: s.skill_id, name: name(s.skills) }))} />
      </SectionCard>
    </div>
  );
}
