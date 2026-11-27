"use client";

import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { writePendingExternal } from "@/lib/applications/external";

/**
 * "Postularme" cuando la postulación es en otro sitio: abre ese sitio en una pestaña nueva (pasando
 * por nuestra ruta, que cuenta el clic) y deja anotado que, al volver, hay que preguntar
 * "¿Te postulaste?" (solo a candidatas: `track`).
 */
export function ExternalApplyLink({
  jobId,
  title,
  company,
  track,
  className,
  ariaLabel,
  children,
}: {
  jobId: string;
  title: string;
  company: string;
  track: boolean;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={`/api/jobs/${jobId}/apply`}
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-label={ariaLabel}
      className={className}
      onClick={() => {
        if (track) writePendingExternal({ jobId, title, company, at: Date.now() });
      }}
    >
      {children}
      <ExternalLink aria-hidden="true" className="size-4" />
    </a>
  );
}
