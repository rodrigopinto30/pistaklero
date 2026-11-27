"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ComponentProps, useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * Campo de contraseña con botón para mostrarla (WCAG 3.3.8: no obliga a memorizar ni a transcribir).
 * Se puede pegar y lo completan los gestores de contraseñas (autocomplete current-password / new-password).
 */
export function PasswordInput({ autoComplete, ...props }: Omit<ComponentProps<"input">, "type"> & { autoComplete: "current-password" | "new-password" }) {
  const t = useTranslations("Auth");
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} autoComplete={autoComplete} spellCheck={false} autoCapitalize="none" className="pr-12" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-controls={props.id}
        aria-label={t("showPassword")}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
      </button>
    </div>
  );
}
