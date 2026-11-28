"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useAccountId } from "./account-context";

const KEY = "pistaklero:account";
type Change = "switched" | "signedIn" | "signedOut";

/**
 * Aviso cuando la cuenta cambió en otra pestaña del mismo navegador (como hace GitHub): cada
 * pestaña anota con qué cuenta se abrió y escucha a las demás. Si no coinciden, pide recargar; así
 * nadie lee ni escribe pensando que es otra persona. Solo se guarda el id, en este navegador.
 */
export function AccountWatcher() {
  const t = useTranslations("Account");
  const userId = useAccountId();
  // El aviso vale para la cuenta con la que se vio: si esta pestaña cambia de cuenta, se va solo.
  const [change, setChange] = useState<{ for: string | null; kind: Change } | null>(null);

  useEffect(() => {
    const mine = userId ?? "";
    try {
      localStorage.setItem(KEY, mine);
    } catch {
      // Sin almacenamiento (modo privado estricto): no hay aviso, la app funciona igual.
    }
    const compare = (current: string | null) => {
      if (current === null) return;
      setChange(current === mine ? null : { for: userId, kind: current === "" ? "signedOut" : mine === "" ? "signedIn" : "switched" });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY) compare(event.newValue);
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      try {
        compare(localStorage.getItem(KEY));
      } catch {
        // Ídem.
      }
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  if (!change || change.for !== userId) return null;
  return (
    <div role="alert" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-(--highlight-yellow) px-4 py-2 text-center text-sm">
      <span>{t(change.kind)}</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-foreground px-3 text-sm font-medium text-background hover:bg-foreground/85"
      >
        <RefreshCw aria-hidden="true" className="size-4" />
        {t("reload")}
      </button>
    </div>
  );
}
