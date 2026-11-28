import { getLocale, getTranslations } from "next-intl/server";
import { Avatar } from "@/components/avatar";
import { timeAgo } from "@/lib/jobs/time";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

/** Las conversaciones: pestañas Bandeja · Solicitudes y, en cada una, quién, lo último y si hay sin leer. */
export async function ConversationList({ box, activeId }: { box: "inbox" | "requests"; activeId?: string }) {
  const t = await getTranslations("Messages");
  const locale = await getLocale();
  const supabase = await createClient();
  const [{ data: rows }, { data: requests }] = await Promise.all([
    supabase.rpc("my_conversations", { p_box: box }),
    box === "inbox" ? supabase.rpc("my_conversations", { p_box: "requests" }) : Promise.resolve({ data: null }),
  ]);
  const conversations = rows ?? [];
  const requestCount = box === "requests" ? conversations.length : (requests ?? []).length;

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label={t("boxesLabel")}>
        <ul className="flex gap-2">
          {(["inbox", "requests"] as const).map((key) => (
            <li key={key}>
              <Link
                href={{ pathname: "/messages", query: key === "requests" ? { caja: "solicitudes" } : {} }}
                aria-current={box === key ? "page" : undefined}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-medium aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
              >
                {t(key)}
                {key === "requests" && requestCount > 0 && <span className="rounded-full bg-destructive px-2 text-xs text-white">{requestCount}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {conversations.length === 0 ? (
        <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-soft">{box === "requests" ? t("emptyRequests") : t("emptyInbox")}</p>
      ) : (
        <ul aria-label={t("listLabel")} className="flex flex-col gap-1 rounded-2xl bg-card p-2 shadow-soft">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={{ pathname: "/messages/[id]", params: { id: c.id } }}
                aria-current={c.id === activeId ? "page" : undefined}
                className={cn("flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted", c.id === activeId && "bg-muted")}
              >
                <Avatar path={c.other_avatar} name={c.other_name} size="md" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cn("truncate", c.unread > 0 ? "font-semibold" : "font-medium")}>{c.other_name}</span>
                    <time dateTime={c.last_message_at} className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(c.last_message_at, locale)}
                    </time>
                  </span>
                  {c.other_subtitle && <span className="truncate text-xs text-muted-foreground">{c.other_subtitle}</span>}
                  <span className={cn("truncate text-sm", c.unread > 0 ? "text-foreground" : "text-muted-foreground")}>
                    {c.waiting ? t("waitingTag") : c.last_sender && c.last_sender !== c.other_id ? t("you", { body: c.last_body ?? "" }) : c.last_body}
                  </span>
                </span>
                {c.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                    <span aria-hidden="true">{c.unread}</span>
                    <span className="sr-only">{t("unread", { count: c.unread })}</span>
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
