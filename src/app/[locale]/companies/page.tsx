import type { Metadata } from "next";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { CompanyCard } from "@/components/companies/company-card";
import { Masonry } from "@/components/masonry";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { Emoji } from "@/components/emoji";

const PAGE_SIZE = 24;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Companies");
  return { title: t("metaTitle"), description: t("subtitle") };
}

export default async function CompaniesPage({ searchParams }: PageProps<"/[locale]/companies">) {
  await connection();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 200) : "";
  const page = Math.min(Math.max(Number(params.page) || 1, 1), 20);
  const locale = await getLocale();
  const t = await getTranslations("Companies");
  const signedIn = Boolean(await getCurrentUser());

  const supabase = await createClient();
  const { data } = await supabase.rpc("company_cards", { p_query: q || undefined, p_limit: PAGE_SIZE * page });
  const companies = data ?? [];
  const total = Number(companies[0]?.total_count ?? 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")} <Emoji symbol="🏢" /></h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {q ? t("countFor", { count: total, query: q }) : t("count", { count: total })}
      </p>
      {companies.length > 0 ? (
        <Masonry label={t("title")}>
          {companies.map((company) => (
            <li key={company.id}>
              <CompanyCard company={company} locale={locale} signedIn={signedIn} />
            </li>
          ))}
        </Masonry>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-card p-6 shadow-soft">
          <p>{q ? t("emptySearch") : t("empty")}</p>
          {q && (
            <Link href="/companies" className={buttonVariants({ variant: "outline" })}>
              {t("seeAll")}
            </Link>
          )}
        </div>
      )}
      {total > companies.length && page < 20 && (
        <Link
          href={{ pathname: "/companies", query: { ...(q ? { q } : {}), page: String(page + 1) } }}
          scroll={false}
          className={buttonVariants({ variant: "outline", className: "self-center rounded-full" })}
        >
          {t("loadMore")}
        </Link>
      )}
    </div>
  );
}
