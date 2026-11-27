/**
 * Lo que una persona sin sesión puede dejar pendiente: se hace solo apenas ingresa (o termina de crear
 * la cuenta). Siempre "prender" (dar me gusta, guardar), nunca alternar: si ya estaba, queda igual.
 */
export const PENDING_KINDS = ["save-job", "like-company", "save-company", "like-post", "save-post"] as const;
export type PendingKind = (typeof PENDING_KINDS)[number];

export function isPendingKind(value: unknown): value is PendingKind {
  return (PENDING_KINDS as readonly unknown[]).includes(value);
}

export const PENDING_COOKIE = "pending_action";
