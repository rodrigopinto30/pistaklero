"use client";

import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Botón de envío con estado "Guardando…". Por defecto va alineado a la izquierda (self-start). */
export function SubmitButton({ label, variant, className }: { label?: string; variant?: "default" | "outline" | "secondary"; className?: string }) {
  const t = useTranslations("Form");
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className ?? "self-start"}>
      {pending ? t("saving") : (label ?? t("save"))}
    </Button>
  );
}
