"use client";

import { useLocale } from "next-intl";
import { type ReactNode, useRef } from "react";
import type { PendingKind } from "@/lib/pending/kinds";
import { rememberAndSignIn } from "@/lib/pending/actions";
import { Tip } from "@/components/tip";

/**
 * Botón de "me gusta" o "guardar" para quien no inició sesión: anota la acción y lleva a ingresar.
 * Al volver, la acción ya está hecha y la persona está en la misma página (con los mismos filtros).
 * Es un formulario: funciona también sin JavaScript (vuelve a `returnTo`, la página del servidor).
 */
export function GuestAction({
  kind,
  id,
  returnTo,
  label,
  labelIsVisible = false,
  className,
  children,
}: {
  kind: PendingKind;
  id: string;
  returnTo: string;
  label: string;
  /** El botón ya muestra su texto ("Guardar"): el nombre accesible es ese (WCAG 2.5.3) y `label` va de título. */
  labelIsVisible?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const locale = useLocale();
  const returnInput = useRef<HTMLInputElement>(null);

  return (
    <form action={rememberAndSignIn} className="contents">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input ref={returnInput} type="hidden" name="returnTo" defaultValue={returnTo} />
      <Tip label={label}>
      <button
        type="submit"
        aria-label={labelIsVisible ? undefined : label}
        className={className}
        // Con JavaScript, vuelve exactamente a donde estaba (búsqueda y filtros incluidos).
        onClick={() => {
          if (returnInput.current) returnInput.current.value = `${window.location.pathname}${window.location.search}`;
        }}
      >
        {children}
      </button>
      </Tip>
    </form>
  );
}
