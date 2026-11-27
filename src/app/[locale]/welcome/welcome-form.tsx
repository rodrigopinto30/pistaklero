"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { OnboardingField } from "@/lib/validation/onboarding";
import { splitFullName } from "@/lib/validation/person";
import type { SignUpRole } from "@/lib/auth/sign-up";
import { Link } from "@/i18n/navigation";
import { completeOnboarding, type OnboardingState } from "./actions";

const initialState: OnboardingState = { status: "idle" };

/*
 * Los campos de cada rol se muestran solo con CSS (`:has(:checked)`), así el formulario
 * funciona igual sin JavaScript. Lo oculto con display:none tampoco lo leen los lectores de pantalla.
 */
export function WelcomeForm({ locale, defaultName, presetRole }: { locale: string; defaultName: string; presetRole: SignUpRole | null }) {
  const t = useTranslations("Welcome");
  const [state, formAction, pending] = useActionState(completeOnboarding, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : {};
  const formError = state.status === "error" ? state.formError : undefined;
  // Con Google o GitHub ya tenemos el nombre: se precarga, separado en nombre y apellido.
  const suggested = splitFullName(defaultName);

  // Después de un error, el foco va al primer campo con problemas (WCAG 3.3.1).
  useEffect(() => {
    if (state.status !== "error") return;
    const invalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], [data-invalid='true']");
    invalid?.focus();
  }, [state]);

  const field = (name: OnboardingField) => ({
    id: `welcome-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": [errors[name] && `welcome-${name}-error`, `welcome-${name}-hint`]
      .filter(Boolean)
      .join(" "),
  });

  const error = (name: OnboardingField) =>
    errors[name] ? (
      <p id={`welcome-${name}-error`} className="text-sm text-destructive">
        {name === "websiteUrl" && (formError === "company_exists" || formError === "company_unclaimed")
          ? t(`errors.${formError}`)
          : t(`errors.${name}`)}
      </p>
    ) : null;

  return (
    <form ref={formRef} action={formAction} noValidate className="group flex flex-col gap-6">
      <input type="hidden" name="locale" value={locale} />

      {formError === "unknown" && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {t("errors.unknown")}
        </p>
      )}

      {presetRole && (
        <p className="rounded-xl bg-secondary px-4 py-3 text-sm">
          {t("chosen", { role: t(presetRole === "candidate" ? "roleCandidate" : "roleRecruiter") })}{" "}
          <Link href="/sign-up" className="font-medium text-primary underline underline-offset-4">
            {t("change")}
          </Link>
        </p>
      )}

      {/* Con el rol elegido en el registro, la elección queda oculta pero sigue en el formulario. */}
      <fieldset
        hidden={Boolean(presetRole)}
        className="flex flex-col gap-3"
        aria-describedby={errors.role ? "welcome-role-hint welcome-role-error" : "welcome-role-hint"}
      >
        <legend className="mb-3 font-medium">{t("roleLegend")}</legend>
        {(["candidate", "recruiter"] as const).map((role) => (
          <label
            key={role}
            className={cn(
              "flex cursor-pointer gap-3 rounded-xl bg-card p-4 shadow-soft transition-shadow hover:shadow-soft-lg",
              "has-checked:ring-2 has-checked:ring-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
            )}
          >
            <input
              type="radio"
              name="role"
              value={role}
              id={`role-${role}`}
              defaultChecked={(values.role ?? presetRole) === role}
              data-invalid={errors.role ? true : undefined}
              className="mt-1 size-4 accent-primary"
            />
            <span className="flex flex-col gap-1">
              <span className="font-medium">{t(role === "candidate" ? "roleCandidate" : "roleRecruiter")}</span>
              <span className="text-sm text-muted-foreground">
                {t(role === "candidate" ? "roleCandidateHint" : "roleRecruiterHint")}
              </span>
            </span>
          </label>
        ))}
        <p id="welcome-role-hint" className="text-sm text-muted-foreground">
          {t("roleNote")}
        </p>
        {errors.role && (
          <p id="welcome-role-error" className="text-sm text-destructive">
            {t("errors.role")}
          </p>
        )}
      </fieldset>

      {/* Nombre, segundo nombre y apellido: los piden los dos roles, apenas se elige uno. */}
      <div className="hidden flex-col gap-4 group-has-[[name=role]:checked]:flex">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="welcome-firstName">
              {t("firstName")}
            </Label>
            <Input {...field("firstName")} aria-required autoComplete="given-name" maxLength={50} defaultValue={values.firstName ?? suggested.firstName} />
            <span id="welcome-firstName-hint" hidden />
            {error("firstName")}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="welcome-middleName">
              {t("middleName")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
            </Label>
            <Input {...field("middleName")} autoComplete="additional-name" maxLength={50} defaultValue={values.middleName} />
            <span id="welcome-middleName-hint" hidden />
            {error("middleName")}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="welcome-lastName">
            {t("lastName")}
          </Label>
          <Input {...field("lastName")} aria-required autoComplete="family-name" maxLength={50} defaultValue={values.lastName ?? suggested.lastName} />
          <span id="welcome-lastName-hint" hidden />
          {error("lastName")}
        </div>
      </div>

      <div className="hidden flex-col gap-4 group-has-[#role-candidate:checked]:flex">
        <div className="flex flex-col gap-2">
          <Label htmlFor="welcome-headline">
            {t("headline")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
          </Label>
          <Input {...field("headline")} maxLength={100} defaultValue={values.headline} />
          <p id="welcome-headline-hint" className="text-sm text-muted-foreground">
            {t("headlineHint")}
          </p>
          {error("headline")}
        </div>
      </div>

      <div className="hidden flex-col gap-4 group-has-[#role-recruiter:checked]:flex">
        <div className="flex flex-col gap-2">
          <Label htmlFor="welcome-companyName">
            {t("companyName")}
          </Label>
          <Input {...field("companyName")} aria-required autoComplete="organization" maxLength={80} defaultValue={values.companyName} />
          <span id="welcome-companyName-hint" hidden />
          {error("companyName")}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="welcome-websiteUrl">
            {t("websiteUrl")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
          </Label>
          <Input
            {...field("websiteUrl")}
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="acme.com"
            maxLength={200}
            defaultValue={values.websiteUrl}
          />
          <p id="welcome-websiteUrl-hint" className="text-sm text-muted-foreground">
            {t("websiteHint")}
          </p>
          {error("websiteUrl")}
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
