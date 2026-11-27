"use client";

import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

type Props = {
  name: string;
  label: string;
  hint?: string;
  /** Imagen ya guardada (si hay). */
  currentUrl?: string | null;
  shape: "square" | "wide" | "round";
  maxBytes: number;
  /** Error del servidor para este campo. */
  error?: string | null;
  /** Lo que se ve sin imagen (por ejemplo, las iniciales). Por defecto, un ícono. */
  placeholder?: React.ReactNode;
  /** Para quitar la imagen ya guardada (con confirmación). Sin esto, "Quitar" solo descarta la elegida. */
  removeSaved?: { action: (formData: FormData) => void | Promise<void>; title: string; description: string };
};

/**
 * Elegir una imagen y verla antes de guardar: aparece apenas se elige; "Cambiar" elige otra y
 * "Quitar" la descarta (o, si ya estaba guardada, la borra después de confirmar).
 * El input de archivo es real (funciona sin JavaScript y con teclado); el rótulo hace de botón.
 */
export function ImagePicker({ name, label, hint, currentUrl, shape, maxBytes, error, placeholder, removeSaved }: Props) {
  const t = useTranslations("ImagePicker");
  const tConfirm = useTranslations("Confirm");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // La URL temporal de la vista previa se libera al cambiarla o al salir.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  // Después de guardar, React vacía el formulario: la vista previa vuelve a la imagen guardada.
  useEffect(() => {
    const form = input.current?.form;
    if (!form) return;
    const onReset = () => setPreview(null);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const clear = () => {
    if (input.current) {
      input.current.value = "";
      // Para que el formulario note el cambio (por ejemplo, el botón "Guardar").
      input.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setPreview(null);
    setLocalError(null);
  };

  const onChange = (file: File | undefined) => {
    setLocalError(null);
    if (!file) return setPreview(null);
    if (!ACCEPTED.includes(file.type)) {
      setLocalError(t("wrongType"));
      clear();
      return;
    }
    if (file.size > maxBytes) {
      setLocalError(t("tooLarge", { size: maxBytes >= 1_000_000 ? `${Math.round(maxBytes / 1_000_000)} MB` : `${Math.round(maxBytes / 1000)} KB` }));
      clear();
      return;
    }
    setPreview(URL.createObjectURL(file));
  };

  const shown = preview ?? currentUrl ?? null;
  const message = localError ?? error ?? null;
  const frame = cn(
    "flex shrink-0 items-center justify-center overflow-hidden bg-muted text-muted-foreground",
    shape === "wide" && "aspect-[3/1] w-full rounded-2xl",
    shape === "square" && "size-24 rounded-2xl",
    shape === "round" && "size-24 rounded-full"
  );

  return (
    <div className="flex flex-col gap-3">
      <span id={`${id}-label`} className="text-sm font-medium">
        {label}
      </span>
      <div className={cn("flex gap-4", shape === "wide" ? "flex-col" : "flex-wrap items-center")}>
        <div className={frame}>
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) o imagen ya optimizada.
            <img src={shown} alt={preview ? t("previewAlt") : t("currentAlt")} className="size-full object-cover" />
          ) : (
            (placeholder ?? <ImageIcon aria-hidden="true" className="size-8" />)
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={input}
            id={id}
            name={name}
            type="file"
            accept={ACCEPTED.join(",")}
            aria-labelledby={`${id}-label ${id}-choose`}
            aria-describedby={[message ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined}
            aria-invalid={message ? true : undefined}
            onChange={(event) => onChange(event.target.files?.[0])}
            className="peer sr-only"
          />
          <label
            id={`${id}-choose`}
            htmlFor={id}
            className={cn(buttonVariants({ variant: "secondary" }), "cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring")}
          >
            {shown ? t("change") : t("choose")}
          </label>
          {preview ? (
            <button type="button" onClick={clear} className={buttonVariants({ variant: "ghost" })}>
              {t("discard")}
            </button>
          ) : (
            currentUrl &&
            removeSaved && (
              <ConfirmButton variant="ghost" formAction={removeSaved.action} title={removeSaved.title} description={removeSaved.description} confirmLabel={tConfirm("remove")}>
                {t("remove")}
              </ConfirmButton>
            )
          )}
        </div>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {message && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
