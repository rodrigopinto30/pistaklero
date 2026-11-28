"use client";

import { type ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";

/** Avisa que hay mensajes nuevos o leídos: la lista de conversaciones se pone al día. */
export const MESSAGES_CHANGED_EVENT = "pistaklero:messages-changed";

/**
 * Contenedor de las páginas de mensajes: ocupa justo la pantalla, como WhatsApp Web (ver
 * data-app-screen en globals.css). Viene marcado desde el servidor, así no salta al cargar, y se
 * desmarca cuando Next oculta la página al navegar (si no, la página siguiente quedaba sin scroll).
 * También vuelve a pedir la lista cuando cambian los mensajes.
 */
export function AppScreen({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useLayoutEffect(() => {
    const element = ref.current;
    element?.setAttribute("data-app-screen", "");
    return () => element?.removeAttribute("data-app-screen");
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Varios avisos seguidos piden la lista una sola vez.
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };
    window.addEventListener(MESSAGES_CHANGED_EVENT, onChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(MESSAGES_CHANGED_EVENT, onChange);
    };
  }, [router]);

  return (
    <div ref={ref} data-app-screen="" className={className}>
      {children}
    </div>
  );
}
