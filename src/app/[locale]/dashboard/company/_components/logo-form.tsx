"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormMessage } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { idleState } from "@/lib/forms";
import { removeCompanyLogo, uploadCompanyLogo } from "../actions";
import { ConfirmButton } from "@/components/confirm-button";

export function LogoForm({ logoUrl, companyName }: { logoUrl: string | null; companyName: string }) {
  const t = useTranslations("Company.logo");
  const tConfirm = useTranslations("Confirm");
  const [state, action] = useActionState(uploadCompanyLogo, idleState);
  const hasError = state.status === "error";

  return (
    <div className="flex flex-col gap-4">
      {logoUrl ? (
        <figure className="flex items-center gap-3">
          {/* Ya está optimizado (WebP 256 px) y viene de nuestro Storage. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={t("current")} width={96} height={96} className="size-24 rounded-xl bg-muted object-contain" />
          <figcaption className="sr-only">{companyName}</figcaption>
        </figure>
      ) : (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      )}
      <form action={action} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="company-logo">{t("file")}</Label>
          <Input
            id="company-logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            aria-invalid={hasError || undefined}
            aria-describedby="company-logo-hint"
            className="h-auto py-2"
          />
          <p id="company-logo-hint" className="text-sm text-muted-foreground">
            {t("hint")}
          </p>
        </div>
        <SubmitButton label={t("upload")} variant="secondary" />
        <FormMessage state={state} success="logoUpdated" />
      </form>
      {logoUrl && (
        <form action={removeCompanyLogo}>
          <ConfirmButton title={tConfirm("removeLogo.title")} description={tConfirm("removeLogo.description")} confirmLabel={tConfirm("remove")}>
            {t("remove")}
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}
