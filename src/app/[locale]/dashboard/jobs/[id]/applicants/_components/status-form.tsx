"use client";

import { useTranslations } from "next-intl";
import { useActionState, useRef } from "react";
import { FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/forms";
import { changeApplicationStatus } from "../actions";

type OpenStatus = "received" | "in_review" | "interview";
type NextStatus = "in_review" | "interview" | "hired";

const NEXT: Record<OpenStatus, NextStatus[]> = {
  received: ["in_review", "interview"],
  in_review: ["interview"],
  interview: ["hired"],
};

/**
 * Avanzar de estado o descartar. Descartar trae plantillas amables, editables:
 * cerrar bien tiene que ser más fácil que ignorar.
 */
export function StatusForm({
  applicationId,
  status,
  candidateName,
  templates,
}: {
  applicationId: string;
  status: OpenStatus;
  candidateName: string;
  templates: string[];
}) {
  const t = useTranslations("Applicants");
  const tStatus = useTranslations("Applicants.actions");
  const [advance, advanceAction] = useActionState(changeApplicationStatus, idleState);
  const [reject, rejectAction] = useActionState(changeApplicationStatus, idleState);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const idPrefix = `app-${applicationId}`;

  return (
    <div className="flex flex-col gap-3">
      <form action={advanceAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="applicationId" value={applicationId} />
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-to`}>{t("moveTo", { name: candidateName })}</Label>
          <NativeSelect id={`${idPrefix}-to`} name="to" defaultValue={NEXT[status][0]} className="w-48">
            {NEXT[status].map((next) => (
              <option key={next} value={next}>
                {tStatus(next)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <SubmitButton label={t("move")} variant="secondary" />
        <FormMessage state={advance} />
      </form>

      <details>
        <summary className="inline-flex min-h-9 cursor-pointer items-center text-sm text-destructive underline-offset-4 hover:underline">
          {t("rejectToggle", { name: candidateName })}
        </summary>
        <form action={rejectAction} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="to" value="rejected" />
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-template`}>{t("template")}</Label>
            <NativeSelect
              id={`${idPrefix}-template`}
              defaultValue="0"
              onChange={(event) => {
                if (messageRef.current) messageRef.current.value = templates[Number(event.target.value)] ?? "";
              }}
            >
              {templates.map((_, index) => (
                <option key={index} value={index}>
                  {t("templateN", { n: index + 1 })}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-message`}>{t("message")}</Label>
            <Textarea
              ref={messageRef}
              id={`${idPrefix}-message`}
              name="message"
              maxLength={1000}
              defaultValue={templates[0]}
              aria-describedby={`${idPrefix}-message-hint`}
              className="min-h-28"
            />
            <p id={`${idPrefix}-message-hint`} className="text-sm text-muted-foreground">
              {t("messageHint")}
            </p>
          </div>
          <SubmitButton label={t("reject")} variant="secondary" />
          <FormMessage state={reject} />
        </form>
      </details>
    </div>
  );
}
