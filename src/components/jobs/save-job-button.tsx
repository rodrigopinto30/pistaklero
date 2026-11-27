"use client";

import { Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { notify } from "@/components/toaster";
import { toggleSavedJob } from "@/lib/jobs/actions";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/tip";

/**
 * Guardar un empleo: un botón conmutable (aria-pressed) con el marcador lleno o vacío.
 * Responde al instante (useOptimistic) y avisa con un toast; si falla, vuelve atrás.
 */
export function SaveJobButton({ jobId, title, saved, variant = "icon", className }: { jobId: string; title: string; saved: boolean; variant?: "icon" | "full"; className?: string }) {
  const t = useTranslations("Jobs.actions");
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      setOptimistic(!optimistic);
      const result = await toggleSavedJob(jobId);
      if (result.status === "error") notify(t(`errors.${result.code}`), "error");
      else notify(t(result.status === "saved" ? "savedToast" : "unsavedToast"));
    });

  const label = optimistic ? t("unsave", { title }) : t("save", { title });
  return (
    <Tip label={variant === "icon" ? label : null}>
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={optimistic}
      aria-label={variant === "icon" ? label : undefined}
      className={cn(
        "relative z-10 inline-flex shrink-0 items-center justify-center gap-2 rounded-full transition-colors disabled:opacity-70",
        variant === "icon" ? "size-10 hover:bg-muted" : "h-10 bg-secondary px-4 text-sm font-medium hover:bg-muted",
        optimistic ? "text-primary" : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <Bookmark aria-hidden="true" className={cn("size-5", optimistic && "fill-current")} />
      {variant === "full" && (optimistic ? t("savedLabel") : t("saveLabel"))}
    </button>
    </Tip>
  );
}
