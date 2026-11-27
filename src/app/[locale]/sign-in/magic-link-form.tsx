"use client";

import { useActionState, useId } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type MagicLinkState, sendMagicLink } from "./actions";

const initialState: MagicLinkState = { status: "idle" };

export function MagicLinkForm({ locale, next, variant = "sign-in" }: { locale: string; next: string; variant?: "sign-in" | "sign-up" }) {
  const t = useTranslations("Auth");
  // En el registro el link confirma el email; para ingresar, abre la sesión.
  const copy = useTranslations(variant === "sign-up" ? "SignUp" : "Auth");
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const hasError = state.status === "error";

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-xl bg-card shadow-soft p-4">
        <h2 className="font-medium">{copy("sentTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy("sentBody", { email: state.email })}</p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-email`}>{t("emailLabel")}</Label>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={hasError ? state.email : undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${errorId} ${hintId}` : hintId}
        />
        <p id={hintId} className="text-sm text-muted-foreground">
          {copy("emailHint")}
        </p>
        {/* role="alert" anuncia el error apenas aparece (WCAG 4.1.3). */}
        <p id={errorId} role="alert" className="text-sm text-destructive empty:hidden">
          {hasError ? t(`errors.${state.code}`) : null}
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? t("sending") : copy("sendLink")}
      </Button>
    </form>
  );
}
