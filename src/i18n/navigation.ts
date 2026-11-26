import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Usar siempre estos en lugar de los de next/link y next/navigation:
// arman la URL traducida del idioma actual.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
