"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useId, useRef } from "react";
import { notify } from "@/components/toaster";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ApplyState, applyToJob } from "./apply-actions";

type Question = { id: string; type: "short_text" | "single_choice"; prompt: string; options: string[] | null; required: boolean };

function Questions({ questions }: { questions: Question[] }) {
  const t = useTranslations("Apply");
  return (
    <>
      {questions.map((q) =>
        q.type === "short_text" ? (
          <div key={q.id} className="flex flex-col gap-2">
            <Label htmlFor={`answer-${q.id}`}>
              {q.prompt}
              {!q.required && <span className="font-normal text-muted-foreground"> {t("optional")}</span>}
            </Label>
            <Textarea
              id={`answer-${q.id}`}
              name={`answer_text_${q.id}`}
              maxLength={280}
              required={q.required}
              aria-describedby={`answer-${q.id}-hint`}
            />
            <p id={`answer-${q.id}-hint`} className="text-sm text-muted-foreground">
              {t("shortHint")}
            </p>
          </div>
        ) : (
          <fieldset key={q.id} className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">
              {q.prompt}
              {!q.required && <span className="font-normal text-muted-foreground"> {t("optional")}</span>}
            </legend>
            {(q.options ?? []).map((option, index) => (
              <label
                key={index}
                className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg bg-secondary px-3 py-2 text-sm has-checked:bg-primary/10 has-checked:text-primary"
              >
                <input type="radio" name={`answer_option_${q.id}`} value={index} required={q.required} className="size-4 shrink-0 accent-primary" />
                {option}
              </label>
            ))}
          </fieldset>
        )
      )}
    </>
  );
}

/**
 * Botón "Postularme". Sin preguntas, envía directo. Con preguntas, abre un <dialog> nativo:
 * el navegador maneja el foco, Esc y el fondo inerte (WCAG 2.1.2 y 2.4.3).
 */
export function ApplyForm({ jobId, questions, autoOpen = false }: { jobId: string; questions: Question[]; autoOpen?: boolean }) {
  const t = useTranslations("Apply");
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyToJob, { status: "idle" });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const dialogId = useId();

  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    notify(t("successToast"));
  }, [state, t]);

  // Desde el botón de la tarjeta (?postular=1): el diálogo de preguntas ya se abre.
  useEffect(() => {
    if (autoOpen && questions.length > 0) dialogRef.current?.showModal();
  }, [autoOpen, questions.length]);

  const message =
    state.status === "success" ? (
      <span className="text-primary">{t("success")}</span>
    ) : state.status === "apply_error" ? (
      <span className="text-destructive">{t(`errors.${state.code}`)}</span>
    ) : state.status === "error" ? (
      <span className="text-destructive">{t("errors.unknown")}</span>
    ) : null;

  if (state.status === "success") {
    return (
      <p role="status" className="text-sm">
        {message}
      </p>
    );
  }

  if (questions.length === 0) {
    return (
      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="jobId" value={jobId} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? t("sending") : t("apply")}
        </Button>
        <p role="status" className="text-sm empty:hidden">
          {message}
        </p>
      </form>
    );
  }

  // Atributos de HTML (Invoker Commands): el botón abre y cierra el diálogo aunque React todavía no
  // haya cargado (por ejemplo, en un celular lento). El onClick queda para los navegadores sin soporte.
  const opens = { commandfor: dialogId, command: "show-modal" };
  const closes = { commandfor: dialogId, command: "close" };
  const open = () => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  };

  return (
    <>
      <button type="button" {...opens} onClick={open} className={buttonVariants({ size: "lg", className: "w-full" })}>
        {t("apply")}
      </button>
      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-labelledby={titleId}
        className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl bg-card p-0 text-foreground shadow-soft-lg backdrop:bg-black/50"
      >
        <form action={action} className="flex flex-col gap-4 p-6">
          <input type="hidden" name="jobId" value={jobId} />
          <h2 id={titleId} className="text-xl font-semibold">
            {t("dialogTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("dialogHint")}</p>
          <Questions questions={questions} />
          <p role="status" className="text-sm empty:hidden">
            {message}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? t("sending") : t("send")}
            </Button>
            <button type="button" {...closes} onClick={() => dialogRef.current?.close()} className={buttonVariants({ variant: "ghost" })}>
              {t("cancel")}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
