import { getFormatter, getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "./status-badge";

const MAIN = ["received", "viewed", "shortlisted", "interview", "hired"] as const;
const TERMINAL: ApplicationStatus[] = ["rejected", "no_response", "withdrawn"];
type Event = { to_status: ApplicationStatus; created_at: string };

/** "En revisión" (de antes) cuenta como "Vista". */
const normalize = (status: ApplicationStatus): ApplicationStatus => (status === "in_review" ? "viewed" : status);

/**
 * La postulación como línea de tiempo: Recibida → Vista → Preseleccionada → Entrevista → Contratada,
 * con la fecha de cada etapa. Si se cerró (no seleccionada, sin respuesta o retirada), la línea se
 * corta ahí. Las etapas que la empresa salteó quedan marcadas como salteadas.
 */
export async function ApplicationTimeline({ status, createdAt, events }: { status: ApplicationStatus; createdAt: string; events: Event[] }) {
  const t = await getTranslations("Applications");
  const format = await getFormatter();
  const date = (value: string) => format.dateTime(new Date(value), { day: "numeric", month: "short" });

  const reached = new Map<ApplicationStatus, string>([["received", createdAt]]);
  for (const event of [...events].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const key = normalize(event.to_status);
    if (!reached.has(key)) reached.set(key, event.created_at);
  }
  const current = normalize(status);
  const closed = TERMINAL.includes(current);
  const last = Math.max(...MAIN.map((stage, index) => (reached.has(stage) ? index : -1)));

  type Step = { key: ApplicationStatus; state: "done" | "skipped" | "pending" | "closed"; at?: string };
  const steps: Step[] = MAIN.flatMap((stage, index): Step[] => {
    if (reached.has(stage)) return [{ key: stage, state: "done", at: reached.get(stage) }];
    if (index < last) return [{ key: stage, state: "skipped" }];
    return closed ? [] : [{ key: stage, state: "pending" }];
  });
  if (closed) steps.push({ key: current, state: "closed", at: reached.get(current) });

  return (
    <ol aria-label={t("timeline.label")} className="flex flex-col gap-3 sm:flex-row sm:gap-0">
      {steps.map((step, index) => {
        const isCurrent = step.key === current;
        const next = steps[index + 1];
        return (
          <li key={step.key} aria-current={isCurrent ? "step" : undefined} className="flex items-start gap-2.5 sm:min-w-0 sm:flex-1 sm:flex-col sm:gap-2">
            <span aria-hidden="true" className="flex items-center pt-1 sm:w-full sm:pt-0">
              <span
                className={cn(
                  "size-3 shrink-0 rounded-full",
                  step.state === "done" && "bg-primary",
                  step.state === "closed" && (step.key === "rejected" ? "bg-destructive" : "bg-muted-foreground"),
                  step.state === "skipped" && "border-2 border-dashed border-muted-foreground/60",
                  step.state === "pending" && "border-2 border-border",
                  isCurrent && "ring-4 ring-primary/20"
                )}
              />
              {next && <span className={cn("ml-1 hidden h-0.5 flex-1 rounded-full sm:block", next.state === "done" || next.state === "closed" ? "bg-primary/60" : "bg-border")} />}
            </span>
            <span className="flex min-w-0 flex-col pr-2 text-sm">
              <span className={cn(step.state === "done" || step.state === "closed" ? "font-medium" : "text-muted-foreground")}>{t(`status.${step.key}`)}</span>
              <span className="text-xs text-muted-foreground">
                {step.at ? <time dateTime={step.at}>{date(step.at)}</time> : t(step.state === "skipped" ? "timeline.skipped" : "timeline.pending")}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
