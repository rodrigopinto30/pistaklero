"use client";

import { Bookmark, Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { GuestAction } from "@/components/pending/guest-action";
import { notify } from "@/components/toaster";
import { toggleCompanyLike, toggleSavedCompany } from "@/lib/companies/actions";
import type { ToggleResult } from "@/lib/posts/actions";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/tip";

type Props = {
  companyId: string;
  name: string;
  liked: boolean;
  saved: boolean;
  likes: number;
  /** Sin sesión: adónde volver después de ingresar (los botones dejan la acción pendiente). */
  guestReturnTo?: string;
  /** "overlay": botones blancos sobre la portada (tarjeta). "inline": en la página de la empresa. */
  variant?: "overlay" | "inline";
};

/** Me gusta y guardar una empresa: conmutables (aria-pressed), al instante y con aviso. */
export function CompanyActions({ companyId, name, liked, saved, likes, guestReturnTo, variant = "overlay" }: Props) {
  const t = useTranslations("Companies.actions");
  const [state, setState] = useOptimistic({ liked, saved, likes });
  const [pending, startTransition] = useTransition();
  const base =
    variant === "overlay"
      ? "relative z-10 inline-flex size-10 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-soft backdrop-blur transition-colors hover:bg-white disabled:opacity-80"
      : "inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-secondary px-4 text-sm font-medium hover:bg-muted disabled:opacity-80";

  const run = (kind: "like" | "save") =>
    startTransition(async () => {
      setState((s) => (kind === "like" ? { ...s, liked: !s.liked, likes: s.likes + (s.liked ? -1 : 1) } : { ...s, saved: !s.saved }));
      const result: ToggleResult = kind === "like" ? await toggleCompanyLike(companyId) : await toggleSavedCompany(companyId);
      if (result.status === "error") return notify(t(`errors.${result.code}`), "error");
      if (kind === "save") notify(t(result.status === "on" ? "savedToast" : "unsavedToast"));
    });

  const heart = (filled: boolean) => <Heart aria-hidden="true" className={cn("size-5", filled && "fill-current text-destructive")} />;
  const bookmark = (filled: boolean) => <Bookmark aria-hidden="true" className={cn("size-5", filled && "fill-current text-primary")} />;
  const count = (
    <span className="tabular-nums">
      {state.likes}
      <span className="sr-only"> {t("likesCount", { count: state.likes })}</span>
    </span>
  );

  if (guestReturnTo !== undefined) {
    return (
      <div className="flex items-center gap-1.5">
        <GuestAction kind="like-company" id={companyId} returnTo={guestReturnTo} label={t("signInToLike", { name })} className={base}>
          {heart(false)}
        </GuestAction>
        {variant === "inline" && count}
        <GuestAction kind="save-company" id={companyId} returnTo={guestReturnTo} label={t("signInToSave", { name })} className={base}>
          {bookmark(false)}
        </GuestAction>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <Tip label={t("likeTip")}>
        <button type="button" onClick={() => run("like")} disabled={pending} aria-pressed={state.liked} aria-label={t("like", { name })} className={base}>
          {heart(state.liked)}
        </button>
      </Tip>
      {/* En la tarjeta, los me gusta van escritos abajo, sobre el degradé; acá, al lado del corazón. */}
      {variant === "inline" && count}
      <Tip label={t("saveTip")}>
        <button type="button" onClick={() => run("save")} disabled={pending} aria-pressed={state.saved} aria-label={t("save", { name })} className={base}>
          {bookmark(state.saved)}
        </button>
      </Tip>
    </div>
  );
}
