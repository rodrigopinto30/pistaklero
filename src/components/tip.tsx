"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import type { ReactElement } from "react";

/**
 * Texto de ayuda al pasar el mouse o al llegar con el teclado (reemplaza al atributo `title`).
 * Cumple WCAG 1.4.13 (contenido al pasar el puntero o con foco):
 *  - se puede cerrar sin mover el puntero ni el foco (Esc);
 *  - se puede pasar el puntero por encima sin que desaparezca;
 *  - queda visible mientras el puntero o el foco estén ahí.
 * También aparece con el foco del teclado (el `title` nativo no). Es un complemento: el control
 * sigue teniendo su nombre accesible propio (aria-label o texto visible).
 */
export function Tip({ label, children, side = "top" }: { label: string | null | undefined; children: ReactElement; side?: "top" | "bottom" | "left" | "right" }) {
  if (!label) return children;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner side={side} sideOffset={8} className="z-[60]">
          <Tooltip.Popup className="max-w-64 origin-[var(--transform-origin)] rounded-lg bg-foreground px-2.5 py-1.5 text-xs leading-snug text-background shadow-soft-lg transition-[scale,opacity] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            {label}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
