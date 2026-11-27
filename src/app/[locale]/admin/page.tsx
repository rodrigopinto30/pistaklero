import type { Metadata } from "next";
import Form from "next/form";
import { getLocale, getTranslations } from "next-intl/server";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPathname, Link, redirect } from "@/i18n/navigation";
import { reviewReport, setCompanyStatus, setUserSuspended } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin");
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Busca con comodines de LIKE escapados: lo que se escribe se busca literal. */
const likePattern = (value: string) => `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export default async function AdminPage({ searchParams }: PageProps<"/[locale]/admin">) {
  const locale = await getLocale();
  if (!(await getCurrentUser())) {
    redirect({ href: { pathname: "/sign-in", query: { next: getPathname({ locale, href: "/admin" }) } }, locale });
  }
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") redirect({ href: "/", locale });

  const t = await getTranslations("Admin");
  const tReasons = await getTranslations("Report.reasons");
  const params = await searchParams;
  const userQuery = typeof params.cuenta === "string" ? params.cuenta.trim().slice(0, 80) : "";
  const companyQuery = typeof params.empresa === "string" ? params.empresa.trim().slice(0, 80) : "";

  const supabase = await createClient();
  const [{ data: reports }, { data: users }, { data: companies }] = await Promise.all([
    supabase.rpc("admin_open_reports"),
    userQuery.length >= 3 ? supabase.rpc("admin_find_users", { p_query: userQuery }) : Promise.resolve({ data: null }),
    companyQuery.length >= 2
      ? supabase.from("companies").select("id, name, domain, status, slug").ilike("name", likePattern(companyQuery)).limit(20)
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>

      <SectionCard id="reports" title={t("reports.title")} description={t("reports.hint")}>
        {(reports ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("reports.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reports!.map((report) => (
              <li key={report.job_id} className="flex flex-col gap-2 rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-col">
                    <Link href={{ pathname: "/jobs/[slug]", params: { slug: report.job_slug } }} className="font-medium underline-offset-4 hover:underline">
                      {report.job_title}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      {report.company_name} · {t("reports.count", { count: Number(report.reports) })}
                      {report.job_status === "hidden" && ` · ${t("reports.hidden")}`}
                    </span>
                  </span>
                </div>
                <p className="text-sm">{report.reasons.map((reason) => tReasons(reason)).join(", ")}</p>
                {report.details.length > 0 && (
                  <ul className="ml-5 list-disc text-sm text-muted-foreground">
                    {report.details.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2">
                  <form action={reviewReport}>
                    <input type="hidden" name="reportId" value={report.first_report_id} />
                    <input type="hidden" name="reviewAction" value="hide_job" />
                    <Button type="submit" variant="destructive" aria-label={t("reports.hideFor", { job: report.job_title })}>
                      {t("reports.hide")}
                    </Button>
                  </form>
                  <form action={reviewReport}>
                    <input type="hidden" name="reportId" value={report.first_report_id} />
                    <input type="hidden" name="reviewAction" value="dismiss" />
                    <Button type="submit" variant="outline" aria-label={t("reports.dismissFor", { job: report.job_title })}>
                      {t("reports.dismiss")}
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard id="users" title={t("users.title")}>
          <Form action={`/${locale}/admin`} className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="admin-user">{t("users.search")}</Label>
              <Input id="admin-user" name="cuenta" type="search" minLength={3} defaultValue={userQuery} />
            </div>
            <Button type="submit" variant="secondary">
              {t("search")}
            </Button>
          </Form>
          {users && (
            <ul className="flex flex-col gap-2">
              {users.length === 0 && <li className="text-sm text-muted-foreground">{t("noResults")}</li>}
              {users.map((user) => (
                <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <span className="flex flex-col">
                    <span className="font-medium">{user.email}</span>
                    <span className="text-sm text-muted-foreground">
                      {user.role ? t(`roles.${user.role}`) : t("roles.none")}
                      {user.company_name && ` · ${user.company_name}`}
                      {user.suspended_at && ` · ${t("users.suspended")}`}
                    </span>
                  </span>
                  {user.role && user.role !== "admin" && (
                    <form action={setUserSuspended}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="suspended" value={user.suspended_at ? "false" : "true"} />
                      <Button type="submit" variant={user.suspended_at ? "outline" : "destructive"} aria-label={t(user.suspended_at ? "users.restoreFor" : "users.suspendFor", { email: user.email })}>
                        {t(user.suspended_at ? "users.restore" : "users.suspend")}
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard id="companies" title={t("companies.title")}>
          <Form action={`/${locale}/admin`} className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="admin-company">{t("companies.search")}</Label>
              <Input id="admin-company" name="empresa" type="search" minLength={2} defaultValue={companyQuery} />
            </div>
            <Button type="submit" variant="secondary">
              {t("search")}
            </Button>
          </Form>
          {companies && (
            <ul className="flex flex-col gap-2">
              {companies.length === 0 && <li className="text-sm text-muted-foreground">{t("noResults")}</li>}
              {companies.map((company) => (
                <li key={company.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <span className="flex flex-col">
                    <span className="font-medium">{company.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {company.domain ?? "—"} · {t(`companies.status.${company.status}`)}
                    </span>
                  </span>
                  <form action={setCompanyStatus}>
                    <input type="hidden" name="companyId" value={company.id} />
                    <input type="hidden" name="status" value={company.status === "suspended" ? "active" : "suspended"} />
                    <Button type="submit" variant={company.status === "suspended" ? "outline" : "destructive"} aria-label={t(company.status === "suspended" ? "companies.restoreFor" : "companies.suspendFor", { company: company.name })}>
                      {t(company.status === "suspended" ? "companies.restore" : "companies.suspend")}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
