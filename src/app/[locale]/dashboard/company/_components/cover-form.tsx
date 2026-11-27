"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormMessage } from "@/components/forms/field";
import { ImagePicker } from "@/components/forms/image-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { idleState } from "@/lib/forms";
import { COVER_MAX_BYTES } from "@/lib/validation/company";
import { removeCompanyCover, uploadCompanyCover } from "../actions";

/** Portada: se ve apenas se elige; "Guardar portada" se activa recién entonces. */
export function CoverForm({ coverUrl }: { coverUrl: string | null }) {
  const t = useTranslations("Company.cover");
  const tConfirm = useTranslations("Confirm");
  const [state, action] = useActionState(uploadCompanyCover, idleState);

  return (
    <form action={action} className="flex flex-col gap-3">
      <ImagePicker
        name="cover"
        label={t("file")}
        hint={t("hint")}
        currentUrl={coverUrl}
        shape="wide"
        maxBytes={COVER_MAX_BYTES}
        removeSaved={{ action: removeCompanyCover, title: tConfirm("removeCover.title"), description: tConfirm("removeCover.description") }}
      />
      <SubmitButton label={t("upload")} variant="secondary" />
      <FormMessage state={state} success="coverUpdated" />
    </form>
  );
}
