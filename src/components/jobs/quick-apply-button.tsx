"use client";

import { CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { applyToJob } from "@/app/[locale]/jobs/[slug]/apply-actions";
import { notify } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";

/**
 * Postularse desde la tarjeta, en 1 clic. Si la oferta tiene preguntas o al perfil le falta algo,
 * lleva a la oferta (con el diálogo de preguntas abierto) y avisa por qué.
 */
export function QuickApplyButton({ jobId, slug, title, applied }: { jobId: string; slug: string; title: string; applied: boolean }) {
  const t = useTranslations("Jobs.actions");
  const tApply = useTranslations("Apply");
  const router = useRouter();
  const [done, setDone] = useState(applied);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <Link
        href="/my-applications"
        className="relative z-10 inline-flex h-9 items-center gap-1.5 rounded-full bg-info/10 px-3 text-sm font-medium text-info"
      >
        <CircleCheck aria-hidden="true" className="size-4" />
        {t("applied")}
      </Link>
    );
  }

  const apply = () =>
    startTransition(async () => {
      const formData = new FormData();
      formData.set("jobId", jobId);
      const result = await applyToJob({ status: "idle" }, formData);
      if (result.status === "success") {
        setDone(true);
        notify(t("appliedToast", { title }));
        return;
      }
      const code = result.status === "apply_error" ? result.code : "unknown";
      if (code === "already_applied") return setDone(true);
      if (code === "answer_required") {
        notify(t("needsAnswers"));
        return router.push({ pathname: "/jobs/[slug]", params: { slug }, query: { postular: "1" } });
      }
      notify(tApply(`errors.${code}`), "error");
      if (code === "profile_incomplete") router.push({ pathname: "/jobs/[slug]", params: { slug } });
    });

  return (
    <Button type="button" size="sm" onClick={apply} disabled={pending} aria-label={t("applyTo", { title })} className="relative z-10 rounded-full px-4">
      {pending ? tApply("sending") : tApply("apply")}
    </Button>
  );
}
