/**
 * Avisos "flash": una acción del servidor deja una cookie corta con una clave y el cliente
 * muestra el toast correspondiente. Sirve para las acciones que redirigen o que no devuelven estado.
 * Solo viaja la clave (nunca texto libre): el cliente la traduce y descarta lo desconocido.
 */
export const FLASH_COOKIE = "flash";

export const FLASH_KEYS = [
  "removed",
  "blocked",
  "unblocked",
  "withdrawn",
  "signedOut",
  "welcome",
  "accountDeleted",
  "teamUpdated",
  "done",
] as const;
export type FlashKey = (typeof FLASH_KEYS)[number];

export function isFlashKey(value: unknown): value is FlashKey {
  return (FLASH_KEYS as readonly unknown[]).includes(value);
}

/** "removed.lq2x9" → "removed" (el sufijo distingue dos avisos iguales seguidos). */
export function parseFlash(value: string | undefined): { key: FlashKey; id: string } | null {
  if (!value) return null;
  const [key] = value.split(".");
  return isFlashKey(key) ? { key, id: value } : null;
}
