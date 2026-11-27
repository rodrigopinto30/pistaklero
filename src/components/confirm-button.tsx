"use client";

import type { VariantProps } from "class-variance-authority";
import { useTranslations } from "next-intl";
import { type ReactNode, useId, useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  /** Lo que muestra el botón que abre la confirmación ("Borrar", un ícono de tacho…). */
  children: ReactNode;
  title: string;
  description?: string;
  confirmLabel: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  className?: string;
  /** Nombre accesible del botón cuando muestra solo un ícono. */
  ariaLabel?: string;
  /** Para formularios con varias acciones: la que ejecuta "Sí, borrar" (formAction de un botón submit). */
  formAction?: (formData: FormData) => void | Promise<void>;
};

/**
 * Botón de una acción que no se puede deshacer (borrar, quitar, retirar). Va dentro del <form> de la
 * acción: abre un diálogo nativo (alertdialog) y recién "Sí, borrar" envía el formulario.
 * - El foco arranca en "Cancelar": un Enter apurado no borra nada.
 * - Esc o "Cancelar" cierran sin hacer nada; el navegador devuelve el foco al botón.
 * - Con Invoker Commands (commandfor) abre aunque React todavía no haya cargado.
 */
export function ConfirmButton({ children, title, description, confirmLabel, variant = "destructive", size, className, ariaLabel, formAction }: Props) {
  const t = useTranslations("Confirm");
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <>
      <button
        type="button"
        {...{ commandfor: id, command: "show-modal" }}
        onClick={() => {
          if (!dialog.current?.open) dialog.current?.showModal();
        }}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        className={buttonVariants({ variant, size, className })}
      >
        {children}
      </button>
      <dialog
        ref={dialog}
        id={id}
        role="alertdialog"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-2xl bg-card p-6 text-foreground shadow-soft-lg backdrop:bg-black/50"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            {...{ commandfor: id, command: "close" }}
            onClick={() => dialog.current?.close()}
            className={buttonVariants({ variant: "ghost" })}
          >
            {t("cancel")}
          </button>
          {/* Está dentro del <form> que envuelve al botón: envía ese formulario (con su acción). */}
          <button
            type="submit"
            formAction={formAction}
            formNoValidate
            onClick={() => dialog.current?.close()}
            className={cn(buttonVariants({ variant: variant === "destructive" ? "destructive" : "default" }))}
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
