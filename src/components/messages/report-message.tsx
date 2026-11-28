"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { reportMessage } from "@/lib/messages/actions";

const REASONS = ["spam", "scam", "offensive", "other"] as const;

/** "Denunciar" debajo de un mensaje recibido: elegir el motivo y enviar. */
export function ReportMessage({ messageId }: { messageId: string }) {
  const t = useTranslations("Messages");
  const [state, action, pending] = useActionState(reportMessage, { status: "idle" as const });
  if (state.status === "done") {
    return (
      <p role="status" className="text-xs text-muted-foreground">
        {t("reported")}
      </p>
    );
  }
  return (
    <details className="text-xs">
      <summary className="inline-flex min-h-6 cursor-pointer items-center text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">{t("report")}</summary>
      <form action={action} className="mt-2 flex flex-col gap-2 rounded-xl bg-card p-3 shadow-soft">
        <input type="hidden" name="messageId" value={messageId} />
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 font-medium">{t("reportLabel")}</legend>
          {REASONS.map((reason, index) => (
            <label key={reason} className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="reason" value={reason} defaultChecked={index === 0} className="size-4 shrink-0 accent-primary" />
              {t(`reportReasons.${reason}`)}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={pending} className="self-start rounded-full bg-secondary px-4 py-2 text-sm font-medium hover:bg-muted">
          {t("reportSend")}
        </button>
      </form>
    </details>
  );
}
