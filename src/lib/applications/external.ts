/** Postulación en otro sitio que quedó por confirmar ("¿Te postulaste?"), guardada en la pestaña. */
export type PendingExternal = { jobId: string; title: string; company: string; at: number };

export const PENDING_EXTERNAL_KEY = "pistaklero:external-apply";

export function readPendingExternal(): PendingExternal | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_EXTERNAL_KEY);
    return raw ? (JSON.parse(raw) as PendingExternal) : null;
  } catch {
    return null;
  }
}

export function writePendingExternal(value: PendingExternal | null) {
  try {
    if (value) window.sessionStorage.setItem(PENDING_EXTERNAL_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(PENDING_EXTERNAL_KEY);
  } catch {
    // Sin almacenamiento (modo privado estricto): simplemente no se pregunta.
  }
}
