"use client";

import { type ReactNode, useEffect, useRef } from "react";

// Se juntan las que quedaron a la vista y se mandan juntas (una sola llamada aunque sean varias).
const queue = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;
function enqueue(id: string) {
  queue.add(id);
  clearTimeout(timer);
  timer = setTimeout(() => {
    const ids = [...queue];
    queue.clear();
    // keepalive: llega aunque la persona ya se haya ido de la página.
    void fetch("/api/applications/viewed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
      keepalive: true,
    }).catch(() => {});
  }, 400);
}

/**
 * Marca la postulación como "Vista" cuando su tarjeta (con toda la información) queda a la vista
 * de la empresa al menos un segundo. La candidata recibe el aviso en la campana.
 */
export function ViewedMarker({ applicationId, children }: { applicationId: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let seen: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(seen);
        if (!entry?.isIntersecting) return;
        seen = setTimeout(() => {
          enqueue(applicationId);
          observer.disconnect();
        }, 1000);
      },
      { threshold: 0.5 }
    );
    observer.observe(element);
    return () => {
      clearTimeout(seen);
      observer.disconnect();
    };
  }, [applicationId]);

  return (
    <div ref={ref} className="flex flex-col gap-4">
      {children}
    </div>
  );
}
