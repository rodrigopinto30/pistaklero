"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentProps, MouseEvent } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Href = ComponentProps<typeof Link>["href"];

type NavigationApi = {
  canGoBack: boolean;
  currentEntry: { index: number } | null;
  entries(): { url: string | null }[];
};

/**
 * ¿La página anterior del historial es de este sitio? Usa la Navigation API (solo ve entradas del
 * mismo origen). Si el navegador no la tiene, no se arriesga: el enlace va a la sección que corresponde.
 */
function previousIsInSite() {
  const navigation = (window as Window & { navigation?: NavigationApi }).navigation;
  if (!navigation?.canGoBack || !navigation.currentEntry) return false;
  const previous = navigation.entries()[navigation.currentEntry.index - 1];
  return Boolean(previous?.url && new URL(previous.url).origin === window.location.origin);
}

/**
 * "← Volver": lleva a donde estabas (como el botón del navegador, con el scroll donde lo dejaste).
 * Si llegaste de afuera (un link directo, Google, un mail), va a `fallback`, la sección de la que
 * cuelga esta vista; sin JavaScript también. Ctrl/⌘ + clic lo abre en otra pestaña, como cualquier enlace.
 */
export function BackLink({ fallback, className }: { fallback: Href; className?: string }) {
  const t = useTranslations("Layout");
  const router = useRouter();

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!previousIsInSite()) return;
    event.preventDefault();
    router.back();
  };

  return (
    <Link
      href={fallback}
      onClick={onClick}
      data-back-link
      className={cn(
        "-ml-3 inline-flex min-h-10 items-center gap-1.5 self-start justify-self-start rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className
      )}
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {t("back")}
    </Link>
  );
}
