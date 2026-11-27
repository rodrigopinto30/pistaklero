import { CircleCheck, CircleDashed, CircleOff, Clock, EyeOff } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isExpired } from "@/lib/jobs/format";

const ICONS = { draft: CircleDashed, published: CircleCheck, closed: CircleOff, hidden: EyeOff, expired: Clock };

/** Estado de una oferta con ícono y texto (nunca solo color). */
export async function JobStatusBadge({ status, validThrough }: { status: "draft" | "published" | "closed" | "hidden"; validThrough: string }) {
  const t = await getTranslations("Jobs.status");
  const effective = status === "published" && isExpired(validThrough) ? "expired" : status;
  const Icon = ICONS[effective];
  return (
    <span
      className={
        effective === "published"
          ? "inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-sm font-medium text-primary-foreground"
          : "inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-sm text-muted-foreground"
      }
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {t(effective)}
    </span>
  );
}
