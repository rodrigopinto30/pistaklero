"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormMessage } from "@/components/forms/field";
import { ImagePicker } from "@/components/forms/image-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { idleState } from "@/lib/forms";
import { LOGO_MAX_BYTES } from "@/lib/validation/company";
import { removeCompanyLogo, uploadCompanyLogo } from "../actions";

/** Logo: se ve apenas se elige; "Guardar logo" se activa recién entonces. */
export function LogoForm({ logoUrl }: { logoUrl: string | null }) {
  const t = useTranslations("Company.logo");
  const tConfirm = useTranslations("Confirm");
  const [state, action] = useActionState(uploadCompanyLogo, idleState);

  return (
    <form action={action} className="flex flex-col gap-3">
      <ImagePicker
        name="logo"
        label={t("file")}
        hint={t("hint")}
        currentUrl={logoUrl}
        shape="square"
        maxBytes={LOGO_MAX_BYTES}
        removeSaved={{ action: removeCompanyLogo, title: tConfirm("removeLogo.title"), description: tConfirm("removeLogo.description") }}
      />
      <SubmitButton label={t("upload")} variant="secondary" />
      <FormMessage state={state} success="logoUpdated" />
    </form>
  );
}
