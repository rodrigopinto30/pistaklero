import { CalendarCheck, Eye, Inbox, MousePointerClick, PartyPopper, Sparkles, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type Status = Database["public"]["Enums"]["application_status"];
type Stats = Database["public"]["Functions"]["company_job_stats"]["Returns"][number];

/** Las etapas, en el orden en que avanza una postulación (las que la cierran, al final). */
export const STAGE_ORDER: Status[] = ["received", "viewed", "shortlisted", "interview", "hired", "rejected", "no_response", "withdrawn"];

export function stageCounts(byStatus: unknown) {
  const raw = (byStatus ?? {}) as Partial<Record<Status, number>>;
  const counts = Object.fromEntries(STAGE_ORDER.map((s) => [s, Number(raw[s] ?? 0)])) as Record<Status, number>;
  counts.viewed += Number(raw.in_review ?? 0); // "En revisión" (de antes) cuenta como "Vista".
  return counts;
}

/**
 * Los números de una oferta. `compact`: una fila de datos para el listado; si no, tarjetas para el
 * resumen. Cada dato lleva ícono y texto (nunca solo color).
 */
export async function JobStatTiles({ stats, compact = false }: { stats: Stats; compact?: boolean }) {
  const t = await getTranslations("MyJobs.stats");
  const counts = stageCounts(stats.by_status);
  const views = Number(stats.views);
  const views7d = Number(stats.views_7d);
  const items = [
    { key: "views", icon: Eye, text: t("views", { count: views }), extra: views7d > 0 ? t("views7d", { count: views7d }) : null },
    ...(stats.external
      ? [{ key: "clicks", icon: MousePointerClick, text: t("clicks", { count: Number(stats.external_clicks) }), extra: null }]
      : [
          { key: "applications", icon: Inbox, text: t("applications", { count: Number(stats.applications) }), extra: null },
          { key: "unreviewed", icon: Sparkles, text: t("unreviewed", { count: counts.received }), extra: null, highlight: counts.received > 0 },
          { key: "shortlisted", icon: Star, text: t("shortlisted", { count: counts.shortlisted }), extra: null },
          { key: "interview", icon: CalendarCheck, text: t("interview", { count: counts.interview }), extra: null },
          { key: "hired", icon: PartyPopper, text: t("hired", { count: counts.hired }), extra: null },
        ]),
  ];

  if (compact) {
    return (
      <ul aria-label={t("label", { title: stats.title })} className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        {items.map(({ key, icon: Icon, text, extra, ...rest }) => (
          <li key={key} className={cn("inline-flex items-center gap-1.5", "highlight" in rest && rest.highlight && "font-medium text-foreground")}>
            <Icon aria-hidden="true" className="size-4" />
            <span>{text}</span>
            {extra && <span className="text-xs">({extra})</span>}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul aria-label={t("label", { title: stats.title })} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(({ key, icon: Icon, text, extra }) => (
        <li key={key} className="flex flex-col gap-1 rounded-2xl bg-card p-4 shadow-soft">
          <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
          <span className="font-semibold">{text}</span>
          {extra && <span className="text-xs text-muted-foreground">{extra}</span>}
        </li>
      ))}
    </ul>
  );
}
