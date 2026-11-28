"use client";

import { useEffect } from "react";

/** Avisa que se vio la oferta (una vez por carga de la página). No bloquea nada ni manda datos. */
export function JobViewBeacon({ jobId }: { jobId: string }) {
  useEffect(() => {
    const url = `/api/jobs/${jobId}/view`;
    if (navigator.sendBeacon?.(url)) return;
    void fetch(url, { method: "POST", keepalive: true, credentials: "same-origin" }).catch(() => {});
  }, [jobId]);
  return null;
}
