/**
 * Las secciones del encabezado. Cada ruta interna pertenece a una (o a ninguna).
 * "Talento" solo la ven las cuentas de empresa.
 */
export type Section = "jobs" | "companies" | "posts" | "talent";

export const SECTION_HREF = { jobs: "/", companies: "/companies", posts: "/posts", talent: "/talent" } as const;

export function sectionOf(pathname: string): Section | null {
  if (pathname === "/" || pathname.startsWith("/jobs")) return "jobs";
  if (pathname.startsWith("/companies")) return "companies";
  if (pathname.startsWith("/posts") || pathname === "/my-posts") return "posts";
  if (pathname.startsWith("/talent")) return "talent";
  return null;
}
