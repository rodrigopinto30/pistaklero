"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormMessage } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/forms";
import { deleteDraft, setJobStatus } from "../actions";

export function StatusControls({ jobId, status, locale }: { jobId: string; status: string; locale: string }) {
  const t = useTranslations("Jobs");
  const [state, action, pending] = useActionState(setJobStatus, idleState);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "published" && (
          <form action={action}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="status" value="closed" />
            <Button type="submit" variant="outline" disabled={pending}>
              {t("close")}
            </Button>
          </form>
        )}
        {status === "closed" && (
          <form action={action}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="status" value="published" />
            <Button type="submit" disabled={pending}>
              {t("reopen")}
            </Button>
          </form>
        )}
        {status === "draft" && (
          <form action={deleteDraft}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="destructive">
              {t("deleteDraft")}
            </Button>
          </form>
        )}
      </div>
      <FormMessage state={state} success="jobStatusUpdated" />
    </div>
  );
}
