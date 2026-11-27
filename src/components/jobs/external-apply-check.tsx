"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { notify } from "@/components/toaster";
import { buttonVariants } from "@/components/ui/button";
import { recordExternalApplication } from "@/lib/applications/actions";
import { type PendingExternal, readPendingExternal, writePendingExternal } from "@/lib/applications/external";

/**
 * Al volver de postularse en otro sitio, pregunta "¿Te postulaste?" (como LinkedIn). Con "Sí",
 * la postulación queda en Mis postulaciones. Se pregunta una sola vez por oferta.
 */
export function ExternalApplyCheck() {
  const t = useTranslations("ExternalApply");
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<PendingExternal | null>(null);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const saved = readPendingExternal();
      // Unos segundos de margen: si vuelve enseguida, todavía no tuvo tiempo de postularse.
      if (!saved || Date.now() - saved.at < 3000) return;
      setPending(saved);
      if (!dialog.current?.open) dialog.current?.showModal();
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  const answer = async (applied: boolean) => {
    const current = pending;
    writePendingExternal(null);
    dialog.current?.close();
    if (!current || !applied) return;
    const result = await recordExternalApplication(current.jobId);
    notify(result.ok ? t("recorded") : t("error"), result.ok ? "success" : "error");
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="external-apply-title"
      onClose={() => writePendingExternal(null)}
      className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-2xl bg-card p-6 text-foreground shadow-soft-lg backdrop:bg-black/50"
    >
      <h2 id="external-apply-title" className="text-lg font-semibold">
        {t("title")}
      </h2>
      {pending && <p className="mt-2 text-sm text-muted-foreground">{t("body", { title: pending.title, company: pending.company })}</p>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" autoFocus onClick={() => answer(false)} className={buttonVariants({ variant: "ghost" })}>
          {t("no")}
        </button>
        <button type="button" onClick={() => answer(true)} className={buttonVariants()}>
          {t("yes")}
        </button>
      </div>
    </dialog>
  );
}
