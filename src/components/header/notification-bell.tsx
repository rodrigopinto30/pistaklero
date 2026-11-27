"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Tip } from "@/components/tip";

export const NOTIFICATIONS_READ_EVENT = "pistaklero:notifications-read";

/**
 * Campana con la cantidad de notificaciones sin leer. Lleva a la sección de notificaciones.
 * El número se actualiza solo: cada minuto y cada vez que se vuelve a la pestaña.
 */
export function NotificationBell({ initialCount }: { initialCount: number }) {
  const t = useTranslations("Notifications");
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/me/notifications/count", { cache: "no-store" });
        const { count: next } = (await response.json()) as { count: number };
        if (alive) setCount(next);
      } catch {
        // Sin conexión: queda el último número.
      }
    };
    const onRead = () => setCount(0);
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener(NOTIFICATIONS_READ_EVENT, onRead);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, onRead);
    };
  }, []);

  const label = count > 0 ? t("bellUnread", { count }) : t("bell");
  return (
    <Tip label={label} side="bottom">
    <Link href="/notifications" aria-label={label} className="relative flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted">
      <Bell aria-hidden="true" className="size-5" />
      {count > 0 && (
        <span aria-hidden="true" className="absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold text-white tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
    </Tip>
  );
}
