import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Emoji } from "@/components/emoji";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { timeAgo } from "@/lib/jobs/time";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { getPathname, Link, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { MarkNotificationsRead } from "./mark-read";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Notifications");
  return { title: t("title"), robots: { index: false } };
}

const EMOJI = {
  application_status: "📬",
  new_applicant: "🙋",
  post_liked: "❤️",
  company_liked: "❤️",
  job_matches: "✨",
  member_joined: "👥",
  role_changed: "🔑",
} as const;

type Data = Record<string, string | number | undefined>;

export default async function NotificationsPage() {
  const locale = (await getLocale()) as AppLocale;
  if (!(await getCurrentUser())) {
    redirect({ href: { pathname: "/sign-in", query: { next: getPathname({ locale, href: "/notifications" }) } }, locale });
  }
  if (!(await getCurrentProfile())) redirect({ href: "/welcome", locale });

  const t = await getTranslations("Notifications");
  const tStatus = await getTranslations("Applications.status");
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("id, kind, data, count, created_at, read_at").order("created_at", { ascending: false }).limit(50);
  const notifications = data ?? [];
  const unread = notifications.filter((n) => !n.read_at).length;

  // Texto y enlace de cada aviso, a partir de los datos guardados.
  const describe = (kind: keyof typeof EMOJI, d: Data, count: number) => {
    const text = (key: string) => String(d[key] ?? "");
    switch (kind) {
      case "application_status":
        return {
          text: t("kinds.application_status", { company: text("company"), job: text("job_title"), status: tStatus(text("status") as "received") }),
          href: "/my-applications" as const,
        };
      case "new_applicant":
        return { text: t("kinds.new_applicant", { count, job: text("job_title") }), href: { pathname: "/dashboard/jobs/[id]/applicants" as const, params: { id: text("job_id") } } };
      case "post_liked":
        return { text: t("kinds.post_liked", { count, title: text("post_title") }), href: { pathname: "/posts/[slug]" as const, params: { slug: text("post_slug") } } };
      case "company_liked":
        return { text: t("kinds.company_liked", { count, company: text("company") }), href: { pathname: "/companies/[slug]" as const, params: { slug: text("company_slug") } } };
      case "job_matches":
        return { text: t("kinds.job_matches", { count: Number(d.count ?? 0) }), href: "/" as const };
      case "member_joined":
        return { text: t("kinds.member_joined", { email: text("email") }), href: "/dashboard/team" as const };
      case "role_changed":
        return { text: t("kinds.role_changed", { role: t(`roles.${text("role") === "owner" ? "owner" : "member"}`), company: text("company") }), href: "/dashboard/team" as const };
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <MarkNotificationsRead unread={unread} />
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("title")} <Emoji symbol="🔔" />
        </h1>
        <p className="text-muted-foreground">{unread > 0 ? t("unreadCount", { count: unread }) : t("allRead")}</p>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl bg-card p-6 shadow-soft">
          <p>
            <Emoji symbol="🌱" className="mr-1.5" />
            {t("empty")}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => {
            const item = describe(n.kind, (n.data ?? {}) as Data, n.count);
            return (
              <li key={n.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl p-4 shadow-soft transition-shadow hover:shadow-soft-lg",
                    n.read_at ? "bg-card" : "bg-primary/8 ring-1 ring-primary/30"
                  )}
                >
                  <Emoji symbol={EMOJI[n.kind]} className="text-xl leading-6" />
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className={cn(!n.read_at && "font-medium")}>{item.text}</span>
                    <span className="text-sm text-muted-foreground">
                      <time dateTime={n.created_at}>{timeAgo(n.created_at, locale)}</time>
                      {!n.read_at && (
                        <>
                          {" · "}
                          <span className="font-medium text-primary">{t("new")}</span>
                        </>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
