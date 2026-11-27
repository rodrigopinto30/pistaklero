import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requireRecruiterPage } from "@/lib/auth/guards";
import type { AppLocale } from "@/i18n/routing";
import { loadJobFormOptions } from "../_components/form-data";
import { JobForm } from "../_components/job-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Jobs");
  return { title: t("metaNew"), robots: { index: false } };
}

export default async function NewJobPage() {
  const locale = (await getLocale()) as AppLocale;
  await requireRecruiterPage(locale, "/dashboard/jobs/new");
  const t = await getTranslations("Jobs");
  const { countries, skillGroups } = await loadJobFormOptions(locale);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("newTitle")}</h1>
        <p className="text-muted-foreground">{t("newSubtitle")}</p>
      </div>
      <JobForm
        locale={locale}
        mode="draft"
        countries={countries}
        skillGroups={skillGroups}
        saved={{
          language: locale,
          seniority: "junior",
          employmentType: "full_time",
          workMode: "remote",
          salaryCurrency: "USD",
          salaryPeriod: "month",
          salaryBasis: "gross",
          validDays: "30",
          question1Type: "none",
          question2Type: "none",
          skills: "",
        }}
      />
    </div>
  );
}
