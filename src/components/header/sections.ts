/** Las tres secciones del encabezado. Cada ruta interna pertenece a una (o a ninguna). */
export type Section = "jobs" | "companies" | "posts";

export const SECTION_HREF = { jobs: "/", companies: "/companies", posts: "/posts" } as const;

export function sectionOf(pathname: string): Section | null {
  if (pathname === "/" || pathname.startsWith("/jobs")) return "jobs";
  if (pathname.startsWith("/companies")) return "companies";
  if (pathname.startsWith("/posts") || pathname === "/my-posts") return "posts";
  return null;
}
