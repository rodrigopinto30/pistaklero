import { CalendarCheck, Circle, CircleCheck, CircleSlash, Clock, Eye, Undo2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Database } from "@/lib/supabase/database.types";

export type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const ICONS = {
  received: Circle,
  in_review: Eye,
  interview: CalendarCheck,
  hired: CircleCheck,
  rejected: CircleSlash,
  no_response: Clock,
  withdrawn: Undo2,
} as const;

/** Estado de la postulación con ícono y texto (nunca solo color). */
export async function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const t = await getTranslations("Applications.status");
  const Icon = ICONS[status];
  const tone =
    status === "hired" || status === "interview"
      ? "bg-primary text-primary-foreground"
      : status === "in_review"
        ? "border border-violet text-violet"
        : status === "no_response"
          ? "border border-warn text-warn"
          : "border border-input text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium ${tone}`}>
      <Icon aria-hidden="true" className="size-3.5" />
      {t(status)}
    </span>
  );
}
