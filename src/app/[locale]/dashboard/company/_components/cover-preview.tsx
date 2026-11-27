import type { ReactNode } from "react";

/** Marco de la vista previa de la portada, con la misma proporción que en la página pública. */
export function CompanyCoverPreview({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-2xl [&>*]:aspect-[3/1] [&>*]:w-full">{children}</div>;
}
