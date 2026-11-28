"use client";

import { type ReactNode, useLayoutEffect, useRef } from "react";

/**
 * Para las páginas de un solo formulario (ingresar, crear cuenta, recuperar la contraseña): la página
 * entra justo en la pantalla, con el pie abajo y el formulario centrado en el medio, sin espacio de
 * sobra para desplazar. Si no entra (un celular chico), se desplaza como cualquier página.
 * Ver data-fit-screen en globals.css. Viene marcado desde el servidor (no salta al cargar) y se
 * desmarca cuando Next oculta la página al navegar (la siguiente vuelve a ser normal).
 */
export function FitScreen({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    element?.setAttribute("data-fit-screen", "");
    return () => element?.removeAttribute("data-fit-screen");
  }, []);
  return (
    <div ref={ref} data-fit-screen="" className={className}>
      {children}
    </div>
  );
}
