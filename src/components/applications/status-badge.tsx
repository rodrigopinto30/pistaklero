import { CalendarCheck, Circle, CircleCheck, CircleSlash, Clock, Eye, Star, Undo2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Database } from "@/lib/supabase/database.types";

export type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const ICONS = {
  received: Circle,
  viewed: Eye,
  in_review: Eye,
  shortlisted: Star,
  interview: CalendarCheck,
  hired: CircleCheck,
  rejected: CircleSlash,
  no_response: Clock,
  withdrawn: Undo2,
} as const;

/*
 * Cada estado con su color (fondo suave y texto del mismo tono, contraste AA verificado),
 * siempre acompañado de ícono y texto: el color nunca es la única pista (WCAG 1.4.1).
 */
const TONES: Record<ApplicationStatus, string> = {
  received: "bg-info/10 text-info",
  viewed: "bg-violet/10 text-violet",
  in_review: "bg-violet/10 text-violet",
  shortlisted: "bg-violet/15 text-violet",
  interview: "bg-warn/12 text-warn",
  hired: "bg-primary/12 text-primary",
  rejected: "bg-destructive/10 text-destructive",
  no_response: "bg-muted text-muted-foreground",
  withdrawn: "bg-muted text-muted-foreground",
};

export async function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const t = await getTranslations("Applications.status");
  const Icon = ICONS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap ${TONES[status]}`}>
      <Icon aria-hidden="true" className="size-4" />
      {t(status)}
    </span>
  );
}
