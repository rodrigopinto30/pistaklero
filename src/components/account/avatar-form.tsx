"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Avatar } from "@/components/avatar";
import { FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { removeAvatar, uploadAvatar } from "@/lib/account/actions";
import { idleState } from "@/lib/forms";

/** Foto de perfil: vista previa redonda, subir una nueva o quitarla. */
export function AvatarForm({ path, name }: { path: string | null; name: string }) {
  const t = useTranslations("Person.avatar");
  const [state, action] = useActionState(uploadAvatar, idleState);
  const hasError = state.status === "error";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <Avatar path={path} name={name} size="xl" />
      <div className="flex flex-1 flex-col gap-3">
        <form action={action} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="person-avatar">{t("file")}</Label>
            <Input
              id="person-avatar"
              name="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              aria-invalid={hasError || undefined}
              aria-describedby="person-avatar-hint"
              className="h-auto py-2"
            />
            <p id="person-avatar-hint" className="text-sm text-muted-foreground">
              {t("hint")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SubmitButton label={t("upload")} variant="secondary" />
            {path && (
              <Button type="submit" variant="ghost" formAction={removeAvatar} formNoValidate>
                {t("remove")}
              </Button>
            )}
          </div>
          <FormMessage state={state} />
        </form>
      </div>
    </div>
  );
}
