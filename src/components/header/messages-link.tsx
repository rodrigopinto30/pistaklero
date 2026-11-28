"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { MESSAGES_CHANGED_EVENT } from "@/components/messages/app-screen";
import { Tip } from "@/components/tip";

export const MESSAGES_READ_EVENT = "pistaklero:messages-read";

/** Cada cuánto se pregunta si hay mensajes nuevos (con la pestaña a la vista). */
const REFRESH_MS = 10_000;

/**
 * Mensajes, con la cantidad sin leer (más las solicitudes nuevas). Se actualiza solo: cada 10
 * segundos con la pestaña a la vista, al volver a ella y al leer una conversación. Si el número
 * cambia, avisa (la lista de conversaciones abierta se pone al día).
 */
export function MessagesLink({ initialCount }: { initialCount: number }) {
  const t = useTranslations("Messages");
  const [count, setCount] = useState(initialCount);
  const last = useRef(initialCount);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/me/messages/count", { cache: "no-store" });
        const { count: next } = (await response.json()) as { count: number };
        if (!alive) return;
        setCount(next);
        if (next !== last.current) window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT));
        last.current = next;
      } catch {
        // Sin conexión: queda el último número.
      }
    };
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener(MESSAGES_READ_EVENT, refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener(MESSAGES_READ_EVENT, refresh);
    };
  }, []);

  const label = count > 0 ? t("headerUnread", { count }) : t("headerLabel");
  return (
    <Tip label={label} side="bottom">
      <Link href="/messages" aria-label={label} className="relative flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted">
        <MessageCircle aria-hidden="true" className="size-5" />
        {count > 0 && (
          <span aria-hidden="true" className="absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold text-white tabular-nums">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Tip>
  );
}
