"use client";

import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormMessage } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/forms";
import { deleteDraft, duplicateJob, setJobStatus } from "../actions";
import { ConfirmButton } from "@/components/confirm-button";

export function StatusControls({ jobId, status, locale, canDuplicate = false }: { jobId: string; status: string; locale: string; canDuplicate?: boolean }) {
  const tMy = useTranslations("MyJobs.actions");
  const t = useTranslations("Jobs");
  const tConfirm = useTranslations("Confirm");
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
        {canDuplicate && (
          <form action={duplicateJob}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="outline">
              <Copy aria-hidden="true" />
              {tMy("duplicate")}
            </Button>
          </form>
        )}
        {status === "draft" && (
          <form action={deleteDraft}>
            <input type="hidden" name="jobId" value={jobId} />
            <input type="hidden" name="locale" value={locale} />
            <ConfirmButton title={tConfirm("deleteDraft.title")} description={tConfirm("noUndo")} confirmLabel={tConfirm("delete")}>
              {t("deleteDraft")}
            </ConfirmButton>
          </form>
        )}
      </div>
      <FormMessage state={state} success="jobStatusUpdated" />
    </div>
  );
}
