import { Building2, CircleAlert, ExternalLink, Factory, MapPin, Rocket, Users } from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { CompanyCover } from "@/components/companies/company-cover";
import { JobCard } from "@/components/jobs/job-card";
import { ResponseBadge } from "@/components/jobs/response-badge";
import { Markdown } from "@/components/markdown";
import { Masonry } from "@/components/masonry";
import { PostCard } from "@/components/posts/post-card";
import { getCurrentUser } from "@/lib/auth/session";
import { countryName } from "@/lib/geo";
import { getJobViewer } from "@/lib/jobs/viewer";
import { companyLogoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { getPathname, Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { CompanyActions } from "@/components/companies/company-actions";
import { industryLabel } from "@/lib/companies/industry";

const TABS = ["about", "jobs", "posts"] as const;
type Tab = (typeof TABS)[number];

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

function Card({ id, title, className, children }: { id: string; title: string; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-3 rounded-2xl bg-card p-6 shadow-soft", className)}>
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function CompanyPage({ params, searchParams }: PageProps<"/[locale]/companies/[slug]">) {
  const { slug } = await params;
  const company = await loadCompany(slug);
  if (!company) notFound();

  const requested = (await searchParams).tab;
  const tab: Tab = TABS.find((t) => t === requested) ?? "about";
  const locale = await getLocale();
  const t = await getTranslations("CompanyPage");
  const td = await getTranslations("Company.details");
  const tIndustry = await getTranslations("Industries");
  const supabase = await createClient();
  const [{ data: stack }, { data: stats }, { data: jobs }, { data: card }] = await Promise.all([
    supabase.from("company_skills").select("skills(name_es, name_en)").eq("company_id", company.id),
    supabase.from("company_response_stats").select("badge").eq("company_id", company.id).maybeSingle(),
    supabase.rpc("company_job_cards", { p_company_id: company.id }),
    // Me gusta y guardada, para los botones del encabezado.
    supabase.rpc("company_cards", { p_company_id: company.id, p_limit: 1 }).then(({ data }) => ({ data: data?.[0] ?? null })),
  ]);
  const user = await getCurrentUser();
  const openJobs = jobs ?? [];
  const viewer = tab === "jobs" ? await getJobViewer(openJobs.map((job) => job.id)) : null;
  // Publicaciones de quienes trabajan en la empresa (sus reclutadores).
  const posts = tab === "posts" ? ((await supabase.rpc("post_cards", { p_company_id: company.id, p_limit: 24 })).data ?? []) : [];
  const signedIn = Boolean(user);

  const logo = companyLogoUrl(company.logo_path);
  const location = [company.city, countryName(company.country, locale)].filter(Boolean).join(", ");
  const links = [
    company.website_url && { label: host(company.website_url), url: company.website_url },
    company.linkedin_url && { label: "LinkedIn", url: company.linkedin_url },
    company.x_url && { label: "X", url: company.x_url },
    company.instagram_url && { label: "Instagram", url: company.instagram_url },
  ].filter(Boolean) as { label: string; url: string }[];
  const facts = [
    company.industry && { icon: Factory, label: td("industry"), value: industryLabel(company.industry, tIndustry as (key: string) => string) },
    company.size && { icon: Users, label: td("size"), value: td(`sizeOptions.${company.size}`) },
    company.stage && { icon: Rocket, label: td("stage"), value: td(`stageOptions.${company.stage}`) },
    location && { icon: MapPin, label: t("location"), value: location },
  ].filter(Boolean) as { icon: typeof Factory; label: string; value: string }[];

  const tabHref = (value: Tab) => ({
    pathname: "/companies/[slug]" as const,
    params: { slug },
    ...(value === "about" ? {} : { query: { tab: value } }),
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      {/* Portada, logo y datos principales */}
      <header className="overflow-hidden rounded-3xl bg-card shadow-soft">
        <CompanyCover name={company.name} coverPath={company.cover_path} logoPath={company.logo_path} className="aspect-[3/1] max-h-72 w-full" />
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- WebP de 256 px ya optimizado, desde nuestro Storage.
            <img src={logo} alt="" width={96} height={96} className="-mt-12 size-24 shrink-0 rounded-2xl bg-card object-contain p-1 shadow-soft-lg ring-4 ring-card" />
          ) : (
            <div aria-hidden="true" className="-mt-12 flex size-24 shrink-0 items-center justify-center rounded-2xl bg-muted shadow-soft-lg ring-4 ring-card">
              <Building2 className="size-10 text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2 sm:pt-4">
            <h1 className="text-3xl font-semibold tracking-tight">{company.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {company.verified_at ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-verified/10 px-3 py-1 font-medium text-verified">
                  <VerifiedBadge />
                  {t("verified")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-warn/12 px-3 py-1 font-medium text-warn">
                  <CircleAlert aria-hidden="true" className="size-4" />
                  {t("unverified")}
                </span>
              )}
              {company.status !== "unclaimed" && <ResponseBadge badge={stats?.badge ?? "new"} />}
              {(company.industry || location) && (
                <span className="text-muted-foreground">{[industryLabel(company.industry, tIndustry as (key: string) => string), location].filter(Boolean).join(" · ")}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-end">
            {card && (
              <CompanyActions
                companyId={company.id}
                name={company.name}
                liked={card.liked}
                saved={card.saved}
                likes={card.likes_count}
                variant="inline"
                guestReturnTo={user ? undefined : getPathname({ locale: locale as AppLocale, href: { pathname: "/companies/[slug]", params: { slug } } })}
              />
            )}
            {company.website_url && (
              <a
                href={company.website_url}
                rel="noopener noreferrer nofollow"
                target="_blank"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-medium hover:bg-muted"
              >
                {t("website")}
                <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      {company.status === "unclaimed" && (
        <section aria-labelledby="company-unclaimed" className="flex flex-col gap-2 rounded-2xl bg-warn/10 p-5">
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

      {/* Pestañas: son enlaces (cada una tiene su URL y funciona sin JavaScript). */}
      <nav aria-label={t("sections")} className="flex gap-6 overflow-x-auto">
        {TABS.map((value) => (
          <Link
            key={value}
            href={tabHref(value)}
            aria-current={tab === value ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 border-transparent text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground",
              tab === value && "border-foreground text-foreground"
            )}
          >
            {value === "about" ? t("aboutTab") : value === "jobs" ? t("jobsTab") : t("postsTab")}
            {value === "jobs" && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{openJobs.length}</span>}
          </Link>
        ))}
      </nav>

      {tab === "about" ? (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card id="company-about" title={t("about")}>
              {company.description ? <Markdown>{company.description}</Markdown> : <p className="text-muted-foreground">{t("noAbout")}</p>}
            </Card>
            {(stack ?? []).length > 0 && (
              <Card id="company-stack" title={t("stack")}>
                <ul className="flex flex-wrap gap-2">
                  {stack!.map((s, i) => (
                    <li key={i} className="rounded-full bg-secondary px-3 py-1 text-sm">
                      {(locale === "en" ? s.skills?.name_en : s.skills?.name_es) ?? ""}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
          <div className="flex flex-col gap-6">
            {facts.length > 0 && (
              <Card id="company-facts" title={t("facts")}>
                <dl className="flex flex-col gap-3">
                  {facts.map((fact) => (
                    <div key={fact.label} className="flex flex-col gap-0.5">
                      <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                        <fact.icon aria-hidden="true" className="size-4 shrink-0" />
                        {fact.label}
                      </dt>
                      <dd className="pl-6 text-sm">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}
            {links.length > 0 && (
              <Card id="company-links" title={t("links")}>
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
              </Card>
            )}
            {openJobs.length > 0 && (
              <Link href={tabHref("jobs")} className="rounded-2xl bg-primary/10 p-5 text-sm font-medium text-primary hover:bg-primary/15">
                {t("seeJobs", { count: openJobs.length })}
              </Link>
            )}
          </div>
        </div>
      ) : tab === "posts" ? (
        <section aria-labelledby="company-posts" className="flex flex-col gap-4">
          <h2 id="company-posts" className="sr-only">
            {t("postsTab")}
          </h2>
          {posts.length === 0 ? (
            <p className="rounded-2xl bg-card p-6 text-muted-foreground shadow-soft">{t("noPosts")}</p>
          ) : (
            <Masonry>
              {posts.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} locale={locale} signedIn={signedIn} />
                </li>
              ))}
            </Masonry>
          )}
        </section>
      ) : (
        <section aria-labelledby="company-jobs" className="flex flex-col gap-4">
          <h2 id="company-jobs" className="sr-only">
            {t("jobs")}
          </h2>
          {openJobs.length === 0 ? (
            <p className="rounded-2xl bg-card p-6 text-muted-foreground shadow-soft">{t("noJobs")}</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {openJobs.map((job) => (
                <li key={job.id}>
                  <JobCard job={job} locale={locale} viewer={viewer ?? undefined} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
