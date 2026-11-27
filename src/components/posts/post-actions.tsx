"use client";

import { Bookmark, Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { GuestAction } from "@/components/pending/guest-action";
import { notify } from "@/components/toaster";
import { type ToggleResult, togglePostLike, toggleSavedPost } from "@/lib/posts/actions";
import { cn } from "@/lib/utils";

type Props = {
  postId: string;
  title: string;
  liked: boolean;
  saved: boolean;
  likes: number;
  /** Sin sesión: adónde volver después de ingresar (los botones dejan la acción pendiente). */
  guestReturnTo?: string;
  size?: "sm" | "md";
};

const iconButton = "relative z-10 inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:opacity-70";

/** Me gusta y guardar: botones conmutables (aria-pressed), al instante y con aviso. */
export function PostActions({ postId, title, liked, saved, likes, guestReturnTo, size = "sm" }: Props) {
  const t = useTranslations("Posts.actions");
  const [state, setState] = useOptimistic({ liked, saved, likes });
  const [pending, startTransition] = useTransition();
  const icon = size === "md" ? "size-6" : "size-5";

  const run = (kind: "like" | "save") =>
    startTransition(async () => {
      setState((s) =>
        kind === "like" ? { ...s, liked: !s.liked, likes: s.likes + (s.liked ? -1 : 1) } : { ...s, saved: !s.saved }
      );
      const result: ToggleResult = kind === "like" ? await togglePostLike(postId) : await toggleSavedPost(postId);
      if (result.status === "error") return notify(t(`errors.${result.code}`), "error");
      if (kind === "save") notify(t(result.status === "on" ? "savedToast" : "unsavedToast"));
    });

  const count = (
    <span className="min-w-4 text-sm text-muted-foreground tabular-nums">
      {state.likes}
      <span className="sr-only"> {t("likesCount", { count: state.likes })}</span>
    </span>
  );

  if (guestReturnTo !== undefined) {
    return (
      <div className="flex items-center gap-1">
        <GuestAction kind="like-post" id={postId} returnTo={guestReturnTo} label={t("signInToLike", { title })} className={cn(iconButton, "text-muted-foreground")}>
          <Heart aria-hidden="true" className={icon} />
        </GuestAction>
        {count}
        <GuestAction kind="save-post" id={postId} returnTo={guestReturnTo} label={t("signInToSave", { title })} className={cn(iconButton, "ml-auto text-muted-foreground")}>
          <Bookmark aria-hidden="true" className={icon} />
        </GuestAction>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => run("like")}
        disabled={pending}
        aria-pressed={state.liked}
        aria-label={t("like", { title })}
        className={cn(iconButton, state.liked ? "text-destructive" : "text-muted-foreground hover:text-foreground")}
      >
        <Heart aria-hidden="true" className={cn(icon, state.liked && "fill-current")} />
      </button>
      {count}
      <button
        type="button"
        onClick={() => run("save")}
        disabled={pending}
        aria-pressed={state.saved}
        aria-label={t("save", { title })}
        className={cn(iconButton, "ml-auto", state.saved ? "text-primary" : "text-muted-foreground hover:text-foreground")}
      >
        <Bookmark aria-hidden="true" className={cn(icon, state.saved && "fill-current")} />
      </button>
    </div>
  );
}
