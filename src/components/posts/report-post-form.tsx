"use client";

import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { idleState } from "@/lib/forms";
import { reportPost } from "@/lib/posts/actions";
import { POST_REPORT_REASONS } from "@/lib/validation/post";

/** Denunciar una publicación (spam, ofensiva, estafa u otro). Tres denuncias la ocultan hasta que la revise el admin. */
export function ReportPostForm({ postId }: { postId: string }) {
  const t = useTranslations("Posts.report");
  const [state, action] = useActionState(reportPost, idleState);

  if (state.status === "success") {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {t("thanks")}
      </p>
    );
  }
  return (
    <details>
      <summary className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-foreground">
        <Flag aria-hidden="true" className="size-4" />
        {t("open")}
      </summary>
      <form action={action} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="postId" value={postId} />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{t("reason")}</legend>
          {POST_REPORT_REASONS.map((reason) => (
            <label key={reason} className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="reason" value={reason} className="size-4 accent-primary" />
              {t(`reasons.${reason}`)}
            </label>
          ))}
        </fieldset>
        <SubmitButton label={t("send")} variant="secondary" />
        <FormMessage state={state} />
      </form>
    </details>
  );
}
