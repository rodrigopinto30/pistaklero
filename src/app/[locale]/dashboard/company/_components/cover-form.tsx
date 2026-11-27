"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { CompanyCoverPreview } from "./cover-preview";
import { FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { idleState } from "@/lib/forms";
import { removeCompanyCover, uploadCompanyCover } from "../actions";
import { ConfirmButton } from "@/components/confirm-button";

/** Portada: vista previa, subir una nueva o quitarla. */
export function CoverForm({ preview, hasCover }: { preview: React.ReactNode; hasCover: boolean }) {
  const t = useTranslations("Company.cover");
  const tConfirm = useTranslations("Confirm");
  const [state, action] = useActionState(uploadCompanyCover, idleState);
  const hasError = state.status === "error";

  return (
    <div className="flex flex-col gap-4">
      <CompanyCoverPreview>{preview}</CompanyCoverPreview>
      <form action={action} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="company-cover">{t("file")}</Label>
          <Input
            id="company-cover"
            name="cover"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            aria-invalid={hasError || undefined}
            aria-describedby="company-cover-hint"
            className="h-auto py-2"
          />
          <p id="company-cover-hint" className="text-sm text-muted-foreground">
            {t("hint")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton label={t("upload")} variant="secondary" />
          {hasCover && (
            <ConfirmButton variant="ghost" formAction={removeCompanyCover} title={tConfirm("removeCover.title")} description={tConfirm("removeCover.description")} confirmLabel={tConfirm("remove")}>
              {t("remove")}
            </ConfirmButton>
          )}
        </div>
        <FormMessage state={state} success="coverUpdated" />
      </form>
    </div>
  );
}
