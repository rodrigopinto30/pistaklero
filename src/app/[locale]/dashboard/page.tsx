import { BadgeCheck, CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { SectionCard } from "@/components/section-card";
import { buttonVariants } from "@/components/ui/button";
import { requireRecruiterPage } from "@/lib/auth/guards";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function DashboardPage() {
  const locale = (await getLocale()) as AppLocale;
  const { company } = await requireRecruiterPage(locale, "/dashboard");
  const t = await getTranslations("Dashboard");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title", { company: company.name })}</h1>
        {company.verified_at ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
            <BadgeCheck aria-hidden="true" className="size-4" />
            {t("verifiedBadge")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-warn px-3 py-1 text-sm text-warn">
            <CircleAlert aria-hidden="true" className="size-4" />
            {t("unverifiedBadge")}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/company" className={buttonVariants()}>
          {t("editCompany")}
        </Link>
        <Link href={{ pathname: "/companies/[slug]", params: { slug: company.slug } }} className={buttonVariants({ variant: "outline" })}>
          {t("viewCompany")}
        </Link>
        <Link href="/dashboard/team" className={buttonVariants({ variant: "outline" })}>
          {t("team")}
        </Link>
      </div>
      <SectionCard id="jobs" title={t("jobsTitle")}>
        <p className="text-sm text-muted-foreground">{t("jobsEmpty")}</p>
      </SectionCard>
    </div>
  );
}
