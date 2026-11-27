import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Grilla intercalada (estilo Pinterest) con columnas de CSS: cada tarjeta ocupa su alto natural.
 * El orden de lectura y de tabulación sigue el del HTML (columna por columna), igual que la vista.
 */
export function Masonry({ label, className, children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className={cn("columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 [&>li]:mb-4 [&>li]:break-inside-avoid", className)}>
      {children}
    </ul>
  );
}
