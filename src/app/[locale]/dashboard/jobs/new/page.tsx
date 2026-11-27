import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requireRecruiterPage } from "@/lib/auth/guards";
import { findTemplate, JOB_TEMPLATES } from "@/lib/jobs/templates";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { loadJobFormOptions } from "../_components/form-data";
import { JobForm } from "../_components/job-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Jobs");
  return { title: t("metaNew"), robots: { index: false } };
}

const chip =
  "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export default async function NewJobPage({ searchParams }: PageProps<"/[locale]/dashboard/jobs/new">) {
  const locale = (await getLocale()) as AppLocale;
  await requireRecruiterPage(locale, "/dashboard/jobs/new");
  const t = await getTranslations("Jobs");
  const { countries, skillGroups, skillIdsBySlug } = await loadJobFormOptions(locale);
  const template = findTemplate((await searchParams).plantilla);
  const copy = template?.[locale];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("newTitle")}</h1>
        <p className="text-muted-foreground">{t("newSubtitle")}</p>
      </div>

      <nav aria-labelledby="templates-title" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
        <h2 id="templates-title" className="flex items-center gap-2 font-semibold">
          <FileText aria-hidden="true" className="size-4 text-primary" />
          {t("templates.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("templates.hint")}</p>
        <ul className="flex flex-wrap gap-2">
          {JOB_TEMPLATES.map((item) => {
            const current = item.slug === template?.slug;
            return (
              <li key={item.slug}>
                <Link
                  href={{ pathname: "/dashboard/jobs/new", query: { plantilla: item.slug } }}
                  aria-current={current ? "true" : undefined}
                  className={`${chip} ${current ? "border-primary bg-primary text-primary-foreground" : "border-input hover:border-primary"}`}
                >
                  {item[locale].title}
                </Link>
              </li>
            );
          })}
          {template && (
            <li>
              <Link href="/dashboard/jobs/new" className={`${chip} border-transparent text-muted-foreground underline underline-offset-4`}>
                {t("templates.blank")}
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* La key rearma el formulario al cambiar de plantilla (los campos usan defaultValue). */}
      <JobForm
        key={template?.slug ?? "blank"}
        locale={locale}
        mode="draft"
        countries={countries}
        skillGroups={skillGroups}
        saved={{
          language: locale,
          seniority: template?.seniority ?? "junior",
          employmentType: "full_time",
          workMode: "remote",
          salaryCurrency: "USD",
          salaryPeriod: "month",
          salaryBasis: "gross",
          validDays: "30",
          question1Type: "none",
          question2Type: "none",
          ...(copy ? { title: copy.title, description: copy.description } : {}),
          skills: (template?.skills ?? []).map((slug) => skillIdsBySlug.get(slug)).filter(Boolean).join(","),
        }}
      />
    </div>
  );
}
