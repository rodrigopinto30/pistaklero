"use client";

import { Toast } from "@base-ui/react/toast";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useEffectEvent, useRef } from "react";
import { FLASH_COOKIE, parseFlash } from "@/lib/flash";

/** Un solo administrador de avisos para todo el sitio: se puede usar desde cualquier componente. */
export const toastManager = Toast.createToastManager();

export type ToastType = "success" | "error";

/** Muestra un aviso chico. Los errores se anuncian con prioridad alta a los lectores de pantalla. */
export function notify(title: string, type: ToastType = "success") {
  toastManager.add({ title, type, priority: type === "error" ? "high" : "low" });
}

function readFlashCookie() {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${FLASH_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Busca avisos que dejó el servidor (cookie "flash"): al cargar, al cambiar de página
 * y durante unos segundos después de enviar cualquier formulario (las acciones son formularios).
 */
function useFlashToasts() {
  const t = useTranslations("Toasts");
  const pathname = usePathname();
  const seen = useRef(new Set<string>());

  const check = useEffectEvent(() => {
    const flash = parseFlash(readFlashCookie());
    if (!flash) return;
    document.cookie = `${FLASH_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    if (seen.current.has(flash.id)) return;
    seen.current.add(flash.id);
    notify(t(flash.key));
  });

  useEffect(() => {
    check();
  }, [pathname]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const afterSubmit = () => {
      clearInterval(timer);
      let ticks = 0;
      timer = setInterval(() => {
        check();
        if (++ticks > 40) clearInterval(timer);
      }, 150);
    };
    const onFocus = () => check();
    document.addEventListener("submit", afterSubmit, true);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      document.removeEventListener("submit", afterSubmit, true);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
}

function ToastList() {
  const t = useTranslations("Toasts");
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => {
    const Icon = toast.type === "error" ? CircleAlert : CircleCheck;
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className="absolute right-0 bottom-0 left-0 z-[calc(1000-var(--toast-index))] mx-auto w-full origin-bottom rounded-xl bg-popover text-popover-foreground shadow-soft-lg select-none [--gap:0.5rem] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*0.5rem)))_scale(calc(1-var(--toast-index)*0.05))] [transition:transform_0.35s_cubic-bezier(0.22,1,0.36,1),opacity_0.35s] data-ending-style:opacity-0 data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))] data-limited:opacity-0 data-starting-style:[transform:translateY(120%)] data-starting-style:opacity-0 motion-reduce:transition-none"
      >
        <Toast.Content className="flex items-center gap-3 py-3 pr-2 pl-4">
          <Icon aria-hidden="true" className={toast.type === "error" ? "size-5 shrink-0 text-destructive" : "size-5 shrink-0 text-primary"} />
          <Toast.Title className="flex-1 text-sm font-medium" />
          <Toast.Close
            aria-label={t("close")}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="size-4" />
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    );
  });
}

/** Avisos (toasts): abajo al centro en el celular y abajo a la derecha en pantallas grandes. */
export function Toaster() {
  const t = useTranslations("Toasts");
  useFlashToasts();
  return (
    <Toast.Provider toastManager={toastManager} timeout={4000} limit={3}>
      <Toast.Portal>
        <Toast.Viewport
          aria-label={t("region")}
          className="fixed right-4 bottom-4 left-4 z-50 mx-auto sm:right-6 sm:bottom-6 sm:left-auto sm:w-[22rem]"
        >
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
