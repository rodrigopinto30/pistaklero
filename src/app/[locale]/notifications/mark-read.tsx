"use client";

import { useEffect } from "react";
import { NOTIFICATIONS_READ_EVENT } from "@/components/header/notification-bell";
import { markAllNotificationsRead } from "@/lib/notifications/actions";

/** Al ver la sección, las notificaciones quedan leídas y la campana vuelve a cero. */
export function MarkNotificationsRead({ unread }: { unread: number }) {
  useEffect(() => {
    if (unread === 0) return;
    markAllNotificationsRead().then(() => window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT)));
  }, [unread]);
  return null;
}
