"use client";

import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFormChanged } from "./use-form-changed";

/**
 * Botón de envío con estado "Guardando…". Por defecto va alineado a la izquierda (self-start).
 * Si no cambió nada del formulario queda inactivo (no hay nada que guardar). Usa aria-disabled en
 * vez de disabled: sigue siendo enfocable y el título explica por qué no hace nada.
 * `requireChanges={false}` para acciones que valen sin tocar nada (mover de etapa, publicar).
 */
export function SubmitButton({
  label,
  variant,
  className,
  requireChanges = true,
}: {
  label?: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
  requireChanges?: boolean;
}) {
  const t = useTranslations("Form");
  const { pending } = useFormStatus();
  const { button, changed } = useFormChanged(requireChanges);
  const inactive = !changed && !pending;

  return (
    <Button
      ref={button}
      type="submit"
      variant={variant}
      disabled={pending}
      aria-disabled={inactive || undefined}
      title={inactive ? t("noChanges") : undefined}
      onClick={(event) => {
        if (inactive) event.preventDefault();
      }}
      className={cn(className ?? "self-start", inactive && "cursor-not-allowed opacity-50")}
    >
      {pending ? t("saving") : (label ?? t("save"))}
    </Button>
  );
}
