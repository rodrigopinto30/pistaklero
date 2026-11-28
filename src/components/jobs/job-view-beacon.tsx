"use client";

import { useEffect, useRef } from "react";

/** Avisa que se vio la oferta (una vez por carga de la página). No bloquea nada ni manda datos. */
export function JobViewBeacon({ jobId }: { jobId: string }) {
  // En desarrollo React monta los efectos dos veces: el ref evita mandar el aviso repetido.
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === jobId) return;
    sent.current = jobId;
    const url = `/api/jobs/${jobId}/view`;
    if (navigator.sendBeacon?.(url)) return;
    void fetch(url, { method: "POST", keepalive: true, credentials: "same-origin" }).catch(() => {});
  }, [jobId]);
  return null;
}
