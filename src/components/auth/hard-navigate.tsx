"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

/**
 * Abre `to` con una navegación completa del navegador (no del router de Next): sirve para rutas que
 * no son páginas, como aceptar una invitación. Sin JavaScript queda el enlace.
 */
export function HardNavigate({ to }: { to: string }) {
  const t = useTranslations("Auth");
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return (
    <a href={to} className="font-medium text-primary underline underline-offset-4">
      {t("continue")}
    </a>
  );
}
