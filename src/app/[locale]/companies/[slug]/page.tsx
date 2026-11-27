import { BadgeCheck, Building2, CircleAlert, ExternalLink, MapPin, Rocket, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ResponseBadge } from "@/components/jobs/response-badge";
import { countryName } from "@/lib/geo";
import { companyLogoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

async function loadCompany(slug: string) {
  const supabase = await createClient();
  // RLS oculta las empresas suspendidas: para el visitante, no existen.
  const { data } = await supabase.from("companies").select("*").eq("slug", slug).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/companies/[slug]">): Promise<Metadata> {
  const company = await loadCompany((await params).slug);
  if (!company) return {};
  return { title: company.name, description: company.description.slice(0, 160) || undefined };
}

function host(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export default async function CompanyPage({ params }: PageProps<"/[locale]/companies/[slug]">) {
  const company = await loadCompany((await params).slug);
  if (!company) notFound();

  const locale = await getLocale();
  const t = await getTranslations("CompanyPage");
  const td = await getTranslations("Company.details");
  const supabase = await createClient();
  const [{ data: stack }, { data: stats }] = await Promise.all([
    supabase.from("company_skills").select("skills(name_es, name_en)").eq("company_id", company.id),
    supabase.from("company_response_stats").select("badge").eq("company_id", company.id).maybeSingle(),
  ]);

  const logo = companyLogoUrl(company.logo_path);
  const location = [company.city, countryName(company.country, locale)].filter(Boolean).join(", ");
  const links = [
    company.website_url && { label: host(company.website_url), url: company.website_url },
    company.linkedin_url && { label: "LinkedIn", url: company.linkedin_url },
    company.x_url && { label: "X", url: company.x_url },
    company.instagram_url && { label: "Instagram", url: company.instagram_url },
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-8 md:grid-cols-3">
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 md:col-span-2 md:flex-row md:items-center">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- WebP de 256 px ya optimizado, desde nuestro Storage.
          <img src={logo} alt="" width={96} height={96} className="size-24 rounded-2xl border border-border bg-muted object-contain" />
        ) : (
          <div aria-hidden="true" className="flex size-24 items-center justify-center rounded-2xl bg-muted">
            <Building2 className="size-10 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{company.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {company.verified_at ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground">
                <BadgeCheck aria-hidden="true" className="size-4" />
                {t("verified")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-warn px-3 py-1 text-warn">
                <CircleAlert aria-hidden="true" className="size-4" />
                {t("unverified")}
              </span>
            )}
            {company.status !== "unclaimed" && <ResponseBadge badge={stats?.badge ?? "new"} />}
            {company.stage && (
              <span className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1">
                <Rocket aria-hidden="true" className="size-4 text-violet" />
                {td(`stageOptions.${company.stage}`)}
              </span>
            )}
            {company.size && (
              <span className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1">
                <Users aria-hidden="true" className="size-4 text-violet" />
                {td(`sizeOptions.${company.size}`)}
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <MapPin aria-hidden="true" className="size-4" />
                {location}
              </span>
            )}
          </div>
          {company.industry && <p className="text-muted-foreground">{company.industry}</p>}
        </div>
      </section>

      <section aria-labelledby="company-links" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <h2 id="company-links" className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t("links")}
        </h2>
        <ul className="flex flex-col gap-2">
          {links.map((link) => (
            <li key={link.url}>
              <a href={link.url} rel="noopener noreferrer nofollow" target="_blank" className="inline-flex items-center gap-1 text-violet underline-offset-4 hover:underline">
                {link.label}
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      {company.status === "unclaimed" && (
        <section aria-labelledby="company-unclaimed" className="flex flex-col gap-2 rounded-2xl border border-warn p-5 md:col-span-3">
          <h2 id="company-unclaimed" className="font-semibold text-warn">
            {t("unclaimed.title")}
          </h2>
          {company.domain ? (
            <p className="text-sm">
              {t("unclaimed.byDomain", { domain: company.domain })}{" "}
              <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4">
                {t("unclaimed.cta")}
              </Link>
            </p>
          ) : (
            <p className="text-sm">{t("unclaimed.contact", { email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hola@pistaklero.com" })}</p>
          )}
        </section>
      )}

      {company.description && (
        <section aria-labelledby="company-about" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 md:col-span-2">
          <h2 id="company-about" className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t("about")}
          </h2>
          <p className="whitespace-pre-line">{company.description}</p>
        </section>
      )}

      {(stack ?? []).length > 0 && (
        <section aria-labelledby="company-stack" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
          <h2 id="company-stack" className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t("stack")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {stack!.map((s, i) => (
              <li key={i} className="rounded-full border border-input px-3 py-1 text-sm">
                {(locale === "en" ? s.skills?.name_en : s.skills?.name_es) ?? ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="company-jobs" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 md:col-span-3">
        <h2 id="company-jobs" className="text-lg font-semibold">
          {t("jobs")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("noJobs")}</p>
      </section>
    </div>
  );
}
