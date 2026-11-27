import { CircleAlert, Clock, Sparkles, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";

export type ResponseBadgeValue = "new" | "fast" | "medium" | "slow";

const STYLE: Record<ResponseBadgeValue, { icon: typeof Zap; className: string }> = {
  fast: { icon: Zap, className: "bg-primary/12 text-primary" },
  medium: { icon: Clock, className: "bg-warn/12 text-warn" },
  slow: { icon: CircleAlert, className: "bg-destructive/10 text-destructive" },
  new: { icon: Sparkles, className: "bg-secondary text-secondary-foreground" },
};

/** Velocidad de respuesta de la empresa (anti-ghosting). Ícono + texto, nunca solo color. */
export async function ResponseBadge({ badge }: { badge: ResponseBadgeValue }) {
  const t = await getTranslations("ResponseBadge");
  const { icon: Icon, className } = STYLE[badge];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      <Icon aria-hidden="true" className="size-3.5" />
      {t(badge)}
    </span>
  );
}
