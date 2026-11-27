"use client";

import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/forms";
import { reportJob } from "./report-actions";

const REASONS = ["scam", "fake", "discrimination", "other"] as const;

export function ReportForm({ jobId }: { jobId: string }) {
  const t = useTranslations("Report");
  const [state, action] = useActionState(reportJob, idleState);

  if (state.status === "success") {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("thanks")}
      </p>
    );
  }

  return (
    <details className="text-sm">
      <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1 text-muted-foreground underline-offset-4 hover:underline">
        <Flag aria-hidden="true" className="size-4" />
        {t("toggle")}
      </summary>
      <form action={action} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="jobId" value={jobId} />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-medium">{t("reason")}</legend>
          {REASONS.map((reason) => (
            <label key={reason} className="flex min-h-9 cursor-pointer items-center gap-2">
              <input type="radio" name="reason" value={reason} required className="size-4 shrink-0 accent-primary" />
              {t(`reasons.${reason}`)}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`report-${jobId}`}>{t("details")}</Label>
          <Textarea id={`report-${jobId}`} name="details" maxLength={500} className="min-h-20" />
        </div>
        <SubmitButton label={t("send")} variant="secondary" />
        <p role="status" className="empty:hidden text-destructive">
          {state.status === "error" ? (state.formError === "duplicate" ? t("duplicate") : t("error")) : null}
        </p>
      </form>
    </details>
  );
}
