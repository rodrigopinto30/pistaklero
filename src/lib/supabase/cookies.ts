/*
 * Opciones de las cookies de sesión. Todo el acceso a Supabase pasa por el servidor
 * (Server Components, Server Actions, Route Handlers), así que el navegador no necesita leerlas:
 * HttpOnly impide que un XSS robe el token (OWASP A04/A07).
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;
