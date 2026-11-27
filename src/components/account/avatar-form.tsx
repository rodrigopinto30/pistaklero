"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Avatar } from "@/components/avatar";
import { FormMessage } from "@/components/forms/field";
import { ImagePicker } from "@/components/forms/image-picker";
import { SubmitButton } from "@/components/forms/submit-button";
import { removeAvatar, uploadAvatar } from "@/lib/account/actions";
import { idleState } from "@/lib/forms";
import { COVER_MAX_BYTES } from "@/lib/validation/company";

/** Foto de perfil: se ve apenas se elige (redonda); "Guardar foto" se activa recién entonces. */
export function AvatarForm({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  const t = useTranslations("Person.avatar");
  const tConfirm = useTranslations("Confirm");
  const [state, action] = useActionState(uploadAvatar, idleState);

  return (
    <form action={action} className="flex flex-col gap-3">
      <ImagePicker
        name="avatar"
        label={t("file")}
        hint={t("hint")}
        currentUrl={photoUrl}
        shape="round"
        maxBytes={COVER_MAX_BYTES}
        placeholder={<Avatar path={null} name={name} size="xl" />}
        removeSaved={{ action: removeAvatar, title: tConfirm("removePhoto.title"), description: tConfirm("removePhoto.description") }}
      />
      <SubmitButton label={t("upload")} variant="secondary" />
      <FormMessage state={state} success="photoUpdated" />
    </form>
  );
}
