"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

type Point = { day: string; label: string; value: number };

/**
 * Barras finas de una sola serie (vistas o postulaciones por día). Una escala por gráfico: las
 * dos medidas van en gráficos separados, nunca con dos ejes. Al pasar el mouse cada barra muestra
 * su día y su número; el detalle completo está en la tabla de abajo (lectores de pantalla y teclado).
 */
export function DailyBars({ title, points, unit }: { title: string; points: Point[]; unit: "views" | "applications" }) {
  const t = useTranslations("MyJobs.stats");
  const label = (count: number) => t(unit, { count });
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const shown = active === null ? null : points[active];

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground tabular-nums">{shown ? `${shown.label}: ${label(shown.value)}` : label(total)}</span>
      </figcaption>
      {/* Lo visual es decorativo para la tecnología asistiva: los números están en la tabla. */}
      <div aria-hidden="true" className="relative flex h-24 items-end gap-0.5 border-b border-border" onPointerLeave={() => setActive(null)}>
        {points.map((point, index) => (
          <div key={point.day} className="flex h-full flex-1 items-end" onPointerEnter={() => setActive(index)}>
            <div
              className={`w-full rounded-t-[4px] transition-colors ${active === index ? "bg-primary" : "bg-primary/70"}`}
              style={{ height: point.value === 0 ? "0px" : `max(3px, ${(point.value / max) * 100}%)` }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex justify-between text-xs text-muted-foreground">
        <span>{points[0]?.label}</span>
        <span>{points.at(-1)?.label}</span>
      </div>
    </figure>
  );
}
