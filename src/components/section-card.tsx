import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Tarjeta del Bento Grid con su título (h2) como nombre accesible de la región. */
export function SectionCard({
  id,
  title,
  description,
  className,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={cn("flex flex-col gap-4 rounded-2xl bg-card shadow-soft p-5", className)}>
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-lg font-semibold">
          {title}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
