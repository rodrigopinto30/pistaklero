"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useActionState, useEffect, useId, useRef } from "react";
import { notify } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import {
  type ChangePasswordState,
  type CodeState,
  type ResetRequestState,
  type ResetState,
  type SignInState,
  type SignUpState,
  changePassword,
  requestPasswordReset,
  resendEmailCode,
  resetPassword,
  signInWithPassword,
  signUpWithPassword,
  verifyEmailCode,
} from "@/lib/auth/password-actions";
import type { SignUpRole } from "@/lib/auth/sign-up";
import { PASSWORD_PROBLEMS, type PasswordProblem } from "@/lib/validation/auth";
import { PasswordInput } from "./password-input";

type ControlProps = { id: string; "aria-invalid": true | undefined; "aria-describedby": string | undefined };

/** Rótulo + control + ayuda + error, asociados con aria-describedby (WCAG 1.3.1 y 3.3.1). */
function AuthField({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: (props: ControlProps) => ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": [errorId, hintId].filter(Boolean).join(" ") || undefined })}
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Error general del formulario: se anuncia apenas aparece (WCAG 4.1.3). */
function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-destructive empty:hidden">
      {children}
    </p>
  );
}

const isPasswordProblem = (code: string): code is PasswordProblem => (PASSWORD_PROBLEMS as readonly string[]).includes(code);

/** Después de un error, el foco va al primer campo inválido. */
function useFocusInvalid(state: { status: string }) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "error") ref.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);
  return ref;
}

// ─── Ingresar ────────────────────────────────────────────────────────────────

export function SignInForm({ locale, next, fixedEmail }: { locale: string; next: string; fixedEmail?: string }) {
  const t = useTranslations("Auth");
  const [state, action, pending] = useActionState<SignInState, FormData>(signInWithPassword, { status: "idle" });
  const formRef = useFocusInvalid(state);

  if (state.status === "confirm") return <VerifyCodeForm locale={locale} email={state.email} next={next} />;

  const error = state.status === "error" ? state : null;
  const emailError = error?.code === "invalid_email" ? t("errors.invalid_email") : null;
  const passwordError = error?.code === "missing_password" ? t("errors.missing_password") : null;
  const formError =
    error?.code === "rate_limited"
      ? t("errors.rate_limited", { minutes: error.minutes })
      : error && (error.code === "invalid_credentials" || error.code === "unknown")
        ? t(`errors.${error.code}`)
        : null;

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      <AuthField label={t("emailLabel")} error={emailError}>
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            readOnly={Boolean(fixedEmail)}
            defaultValue={fixedEmail ?? error?.email}
          />
        )}
      </AuthField>
      <AuthField label={t("passwordLabel")} error={passwordError}>
        {(props) => <PasswordInput {...props} name="password" autoComplete="current-password" required />}
      </AuthField>
      <Link href="/forgot-password" className="-mt-2 self-start text-sm font-medium text-primary underline underline-offset-4">
        {t("forgot")}
      </Link>
      <FormAlert>{formError}</FormAlert>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}

// ─── Crear la cuenta ─────────────────────────────────────────────────────────

export function SignUpForm({ locale, role, next }: { locale: string; role: SignUpRole; next?: string }) {
  const t = useTranslations("SignUp");
  const tAuth = useTranslations("Auth");
  const tPassword = useTranslations("Password");
  const [state, action, pending] = useActionState<SignUpState, FormData>(signUpWithPassword, { status: "idle" });
  const formRef = useFocusInvalid(state);

  if (state.status === "verify") return <VerifyCodeForm locale={locale} email={state.email} role={role} next={next} fromSignUp />;

  const error = state.status === "error" ? state : null;
  const emailError = error?.code === "invalid_email" ? tAuth("errors.invalid_email") : null;
  const passwordError = error && isPasswordProblem(error.code) ? tPassword(`problems.${error.code}`) : null;
  const formError =
    error?.code === "rate_limited" ? tAuth("errors.rate_limited", { minutes: error.minutes }) : error?.code === "unknown" ? tAuth("errors.unknown") : null;

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <AuthField label={tAuth("emailLabel")} error={emailError}>
        {(props) => <Input {...props} name="email" type="email" autoComplete="username" inputMode="email" required defaultValue={error?.email} />}
      </AuthField>
      <AuthField label={tAuth("passwordLabel")} hint={tPassword("hint")} error={passwordError}>
        {(props) => <PasswordInput {...props} name="password" autoComplete="new-password" required />}
      </AuthField>
      <FormAlert>{formError}</FormAlert>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}

// ─── Código de 6 dígitos ─────────────────────────────────────────────────────

function CodeInput(props: ControlProps) {
  return (
    <Input
      {...props}
      name="code"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      required
      // El código se ve grande y espaciado, fácil de comparar con el del email.
      className="h-12 text-center font-mono text-2xl tracking-[0.5em] md:text-2xl"
    />
  );
}

function ResendCode({ email }: { email: string }) {
  const t = useTranslations("Code");
  const tAuth = useTranslations("Auth");
  const [state, action, pending] = useActionState<CodeState, FormData>(resendEmailCode, { status: "idle" });
  useEffect(() => {
    if (state.status === "resent") notify(t("resent"));
  }, [state, t]);
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="email" value={email} />
      <Button type="submit" variant="ghost" disabled={pending} className="self-start">
        {t("resend")}
      </Button>
      {state.status === "error" && state.code === "rate_limited" && <FormAlert>{tAuth("errors.rate_limited", { minutes: state.minutes })}</FormAlert>}
    </form>
  );
}

/** Confirmar el email con el código (al crear la cuenta, o al ingresar si nunca se confirmó). */
export function VerifyCodeForm({ locale, email, role, next, fromSignUp = false }: { locale: string; email: string; role?: SignUpRole; next?: string; fromSignUp?: boolean }) {
  const t = useTranslations("Code");
  const tAuth = useTranslations("Auth");
  const [state, action, pending] = useActionState<CodeState, FormData>(verifyEmailCode, { status: "idle" });
  const formRef = useFocusInvalid(state);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // La pantalla cambia sin navegar: el foco va al título para que se anuncie (WCAG 2.4.3).
  useEffect(() => headingRef.current?.focus(), []);

  const error = state.status === "error" ? state : null;
  const codeError = error?.code === "invalid_code" ? t("errors.invalid_code") : null;
  const formError =
    error?.code === "rate_limited" ? tAuth("errors.rate_limited", { minutes: error.minutes }) : error?.code === "unknown" ? tAuth("errors.unknown") : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("body", { email })}</p>
      </div>
      <form ref={formRef} action={action} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="email" value={email} />
        {role && <input type="hidden" name="role" value={role} />}
        {next && <input type="hidden" name="next" value={next} />}
        <AuthField label={t("label")} error={codeError}>
          {(props) => <CodeInput {...props} />}
        </AuthField>
        <FormAlert>{formError}</FormAlert>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t("submitting") : t("submit")}
        </Button>
      </form>
      <ResendCode email={email} />
      {fromSignUp && (
        <p className="text-sm text-muted-foreground">
          {t("alreadyHadAccount")}{" "}
          <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4">
            {t("signIn")}
          </Link>{" "}
          ·{" "}
          <Link href="/forgot-password" className="font-medium text-primary underline underline-offset-4">
            {t("forgot")}
          </Link>
        </p>
      )}
    </div>
  );
}

// ─── Recuperar la contraseña ─────────────────────────────────────────────────

export function ForgotPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations("Password");
  const tAuth = useTranslations("Auth");
  const [request, requestAction, requesting] = useActionState<ResetRequestState, FormData>(requestPasswordReset, { status: "idle" });
  const requestRef = useFocusInvalid(request);

  if (request.status === "sent") return <ResetPasswordForm locale={locale} email={request.email} />;

  const error = request.status === "error" ? request : null;
  return (
    <form ref={requestRef} action={requestAction} noValidate className="flex flex-col gap-4">
      <AuthField label={tAuth("emailLabel")} error={error?.code === "invalid_email" ? tAuth("errors.invalid_email") : null}>
        {(props) => <Input {...props} name="email" type="email" autoComplete="username" inputMode="email" required defaultValue={error?.email} />}
      </AuthField>
      <FormAlert>{error?.code === "rate_limited" ? tAuth("errors.rate_limited", { minutes: error.minutes }) : null}</FormAlert>
      <Button type="submit" size="lg" disabled={requesting}>
        {requesting ? tAuth("sending") : t("send")}
      </Button>
    </form>
  );
}

function ResetPasswordForm({ locale, email }: { locale: string; email: string }) {
  const t = useTranslations("Password");
  const tCode = useTranslations("Code");
  const tAuth = useTranslations("Auth");
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, { status: "idle" });
  const formRef = useFocusInvalid(state);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  const error = state.status === "error" ? state : null;
  const codeError = error?.code === "invalid_code" ? tCode("errors.invalid_code") : null;
  const passwordError = error && isPasswordProblem(error.code) ? t(`problems.${error.code}`) : null;
  const formError =
    error?.code === "rate_limited" ? tAuth("errors.rate_limited", { minutes: error.minutes }) : error?.code === "unknown" ? tAuth("errors.unknown") : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
          {tCode("title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("codeSent", { email })}</p>
      </div>
      <form ref={formRef} action={action} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="email" value={email} />
        {/* Para que el gestor de contraseñas asocie la nueva a esta cuenta. */}
        <input type="text" name="username" value={email} autoComplete="username" readOnly hidden />
        <AuthField label={tCode("label")} error={codeError}>
          {(props) => <CodeInput {...props} />}
        </AuthField>
        <AuthField label={t("newPassword")} hint={t("hint")} error={passwordError}>
          {(props) => <PasswordInput {...props} name="password" autoComplete="new-password" required />}
        </AuthField>
        <FormAlert>{formError}</FormAlert>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </form>
    </div>
  );
}

// ─── Cambiar la contraseña (Ajustes) ─────────────────────────────────────────

export function ChangePasswordForm({ email }: { email: string }) {
  const t = useTranslations("Password");
  const tAuth = useTranslations("Auth");
  const tToasts = useTranslations("Toasts");
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changePassword, { status: "idle" });
  const formRef = useFocusInvalid(state);
  const savedAt = state.status === "success" ? state.savedAt : null;

  useEffect(() => {
    if (!savedAt) return;
    notify(tToasts("passwordChanged"));
    formRef.current?.reset();
  }, [savedAt, tToasts, formRef]);

  const error = state.status === "error" ? state : null;
  const currentError =
    error?.code === "wrong_current" ? t("change.errors.wrong_current") : error?.code === "missing_current" ? t("change.errors.missing_current") : null;
  const passwordError = error && isPasswordProblem(error.code) ? t(`problems.${error.code}`) : null;
  const formError =
    error?.code === "rate_limited" ? tAuth("errors.rate_limited", { minutes: error.minutes }) : error?.code === "unknown" ? tAuth("errors.unknown") : null;

  return (
    <form ref={formRef} action={action} noValidate className="flex max-w-sm flex-col gap-4">
      <input type="text" name="username" value={email} autoComplete="username" readOnly hidden />
      <AuthField label={t("change.current")} error={currentError}>
        {(props) => <PasswordInput {...props} name="current_password" autoComplete="current-password" required />}
      </AuthField>
      <AuthField label={t("newPassword")} hint={t("hint")} error={passwordError}>
        {(props) => <PasswordInput {...props} name="password" autoComplete="new-password" required />}
      </AuthField>
      <FormAlert>{formError}</FormAlert>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t("saving") : t("change.submit")}
      </Button>
      <p className="text-sm text-muted-foreground">
        {t("change.noPassword")}{" "}
        <Link href="/forgot-password" className="font-medium text-primary underline underline-offset-4">
          {t("change.noPasswordLink")}
        </Link>
      </p>
    </form>
  );
}
