/*
 * Cabeceras de seguridad (OWASP A02 / A05).
 *
 * - La CSP cambia en cada pedido (lleva un nonce), por eso la arma el proxy.
 * - El resto son fijas y se aplican desde next.config.ts.
 */

type Header = { key: string; value: string };

export type CspOptions = {
  nonce: string;
  isDev: boolean;
  /** Orígenes extra a los que el navegador puede conectarse (por ejemplo, Supabase). */
  connectSrc?: string[];
  /** Orígenes extra para imágenes (por ejemplo, avatares de Google o GitHub). */
  imgSrc?: string[];
};

/** Nonce aleatorio de 128 bits en base64, distinto en cada pedido. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function buildContentSecurityPolicy({
  nonce,
  isDev,
  connectSrc = [],
  imgSrc = [],
}: CspOptions): string {
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    // Solo corren los scripts con el nonce y los que esos scripts carguen ('strict-dynamic').
    // En desarrollo React necesita eval para depurar.
    [
      "script-src",
      ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    ],
    // Los componentes usan atributos style en el HTML, y esos no admiten nonce.
    // El riesgo de inyectar CSS es mucho menor que el de inyectar scripts.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", ...imgSrc]],
    ["font-src", ["'self'"]],
    // En desarrollo, la recarga en caliente usa WebSocket.
    // blob: para la vista previa de una imagen elegida (React la precarga antes de mostrarla).
    ["connect-src", ["'self'", "blob:", ...(isDev ? ["ws:"] : []), ...connectSrc]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'none'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
  ];

  const policy = directives.map(([name, values]) => `${name} ${values.join(" ")}`);
  // En producción todo va por HTTPS; en desarrollo la app corre en http://127.0.0.1.
  if (!isDev) policy.push("upgrade-insecure-requests");

  return policy.join("; ");
}

/** Cabeceras fijas para todas las respuestas. */
export function getStaticSecurityHeaders({ isProduction }: { isProduction: boolean }): Header[] {
  const headers: Header[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    // Respaldo de frame-ancestors para navegadores viejos.
    { key: "X-Frame-Options", value: "DENY" },
  ];

  // HSTS solo en producción: en desarrollo no hay HTTPS.
  if (isProduction) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  }

  return headers;
}
