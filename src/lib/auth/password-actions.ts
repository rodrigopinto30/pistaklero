"use server";

import { redirect } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import { parseLocale } from "@/i18n/locale";
import { flash } from "@/lib/flash.server";
import { safeNextPath } from "@/lib/auth/redirect";
import { destinationAfterSignIn } from "@/lib/auth/redirects.server";
import { passwordProblem } from "@/lib/auth/password";
import { parseSignUpRole } from "@/lib/auth/sign-up";
import { clearFailures, minutesToWait, registerFailure } from "@/lib/auth/throttle";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { codeSchema, emailSchema, type PasswordProblem } from "@/lib/validation/auth";

/*
 * Ingreso con email y contraseña (OWASP ASVS V6):
 *   - mensajes que no revelan si una cuenta existe ("el email o la contraseña no son correctos");
 *   - límite de intentos fallidos por email y por IP (throttle.ts);
 *   - el email se confirma una vez, con un código de 6 dígitos;
 *   - las contraseñas más comunes se rechazan, sin reglas de composición.
 */

type RateLimited = { code: "rate_limited"; minutes: number };
/**
 * Termina el ingreso yendo a `destination`. Aceptar una invitación es una ruta /api/…, no una página:
 * si la Server Action redirigiera ahí, Next mostraría el resultado con la URL de la API en la barra.
 * Por eso pasa por la página de la invitación, que abre la ruta con una navegación completa.
 */
function finish(destination: string): never {
  if (!destination.startsWith("/api/")) redirect(destination);
  const locale = parseLocale(new URL(destination, "http://placeholder.invalid").searchParams.get("locale"));
  redirect(`${getPathname({ locale, href: "/invitation" })}?${new URLSearchParams({ continue: destination })}`);
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "");
const emailOf = (formData: FormData) => text(formData, "email").trim().toLowerCase();

// ─── Ingresar ────────────────────────────────────────────────────────────────

export type SignInState =
  | { status: "idle" }
  | { status: "confirm"; email: string }
  | ({ status: "error"; email: string } & ({ code: "invalid_email" | "missing_password" | "invalid_credentials" | "unknown" } | RateLimited));

export async function signInWithPassword(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const locale = parseLocale(formData.get("locale"));
  const next = safeNextPath(formData.get("next"), `/${locale}`);
  const email = emailOf(formData);
  const password = text(formData, "password");

  if (!emailSchema.safeParse(email).success) return { status: "error", code: "invalid_email", email };
  if (!password) return { status: "error", code: "missing_password", email };

  const minutes = await minutesToWait(email);
  if (minutes > 0) return { status: "error", code: "rate_limited", minutes, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // La contraseña es correcta pero el email nunca se confirmó: se manda un código nuevo.
    if (error.code === "email_not_confirmed") {
      await supabase.auth.resend({ type: "signup", email });
      return { status: "confirm", email };
    }
    if (error.status === 429) return { status: "error", code: "rate_limited", minutes: 5, email };
    if (error.code === "invalid_credentials") {
      await registerFailure(email);
      return { status: "error", code: "invalid_credentials", email };
    }
    console.error("signInWithPassword falló", { status: error.status, code: error.code });
    return { status: "error", code: "unknown", email };
  }

  await clearFailures(email);
  finish(await destinationAfterSignIn(supabase, next));
}

// ─── Crear la cuenta ─────────────────────────────────────────────────────────

export type SignUpState =
  | { status: "idle" }
  | { status: "verify"; email: string }
  | ({ status: "error"; email: string } & ({ code: "invalid_email" | PasswordProblem | "unknown" } | RateLimited));

export async function signUpWithPassword(_previous: SignUpState, formData: FormData): Promise<SignUpState> {
  const email = emailOf(formData);
  const password = text(formData, "password");

  if (!emailSchema.safeParse(email).success) return { status: "error", code: "invalid_email", email };
  const problem = passwordProblem(password, email);
  if (problem) return { status: "error", code: problem, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    if (error.status === 429) return { status: "error", code: "rate_limited", minutes: 5, email };
    if (error.code === "weak_password") return { status: "error", code: "too_short", email };
    if (error.code === "email_address_invalid") return { status: "error", code: "invalid_email", email };
    console.error("signUp falló", { status: error.status, code: error.code });
    return { status: "error", code: "unknown", email };
  }

  // Si el email ya tenía cuenta, Supabase responde igual (no revela quién está registrado):
  // la pantalla del código avisa que, en ese caso, conviene ingresar o recuperar la contraseña.
  return { status: "verify", email };
}

// ─── Confirmar el email con el código ────────────────────────────────────────

export type CodeState =
  | { status: "idle" }
  | { status: "resent" }
  | ({ status: "error" } & ({ code: "invalid_code" | "unknown" } | RateLimited));

export async function verifyEmailCode(_previous: CodeState, formData: FormData): Promise<CodeState> {
  const locale = parseLocale(formData.get("locale"));
  const email = emailOf(formData);
  const role = parseSignUpRole(formData.get("role"));
  const requested = safeNextPath(formData.get("next"), `/${locale}`);
  // Una invitación crea el perfil al aceptarla: va directo. Desde el registro, sigue la bienvenida
  // con el rol elegido; desde el ingreso, adonde iba.
  const next =
    role && !requested.startsWith("/api/team/accept?")
      ? `${getPathname({ locale, href: "/welcome" })}?${new URLSearchParams({ role })}`
      : requested;

  const code = codeSchema.safeParse(text(formData, "code"));
  if (!code.success || !emailSchema.safeParse(email).success) return { status: "error", code: "invalid_code" };

  const minutes = await minutesToWait(email);
  if (minutes > 0) return { status: "error", code: "rate_limited", minutes };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code.data, type: "email" });
  if (error) {
    if (error.status === 429) return { status: "error", code: "rate_limited", minutes: 5 };
    await registerFailure(email);
    return { status: "error", code: "invalid_code" };
  }

  await clearFailures(email);
  finish(await destinationAfterSignIn(supabase, next));
}

export async function resendEmailCode(_previous: CodeState, formData: FormData): Promise<CodeState> {
  const email = emailOf(formData);
  if (!emailSchema.safeParse(email).success) return { status: "error", code: "unknown" };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error?.status === 429) return { status: "error", code: "rate_limited", minutes: 1 };
  return { status: "resent" };
}

// ─── Recuperar la contraseña ─────────────────────────────────────────────────

export type ResetRequestState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | ({ status: "error"; email: string } & ({ code: "invalid_email" } | RateLimited));

export async function requestPasswordReset(_previous: ResetRequestState, formData: FormData): Promise<ResetRequestState> {
  const email = emailOf(formData);
  if (!emailSchema.safeParse(email).success) return { status: "error", code: "invalid_email", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error?.status === 429) return { status: "error", code: "rate_limited", minutes: 1, email };
  if (error) console.error("resetPasswordForEmail falló", { status: error.status, code: error.code });
  // Siempre la misma respuesta, exista o no la cuenta.
  return { status: "sent", email };
}

export type ResetState =
  | { status: "idle" }
  // typedCode: el código que escribió, para no tener que copiarlo de nuevo si falló la contraseña.
  | ({ status: "error"; typedCode: string } & ({ code: "invalid_code" | PasswordProblem | "unknown" } | RateLimited));

export async function resetPassword(_previous: ResetState, formData: FormData): Promise<ResetState> {
  const locale = parseLocale(formData.get("locale"));
  const email = emailOf(formData);
  const password = text(formData, "password");

  const typedCode = text(formData, "code").trim().slice(0, 6);
  const code = codeSchema.safeParse(typedCode);
  if (!code.success || !emailSchema.safeParse(email).success) return { status: "error", code: "invalid_code", typedCode: "" };
  // La contraseña se revisa antes de usar el código: el código sirve una sola vez.
  const problem = passwordProblem(password, email);
  if (problem) return { status: "error", code: problem, typedCode };

  const minutes = await minutesToWait(email);
  if (minutes > 0) return { status: "error", code: "rate_limited", minutes, typedCode };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code.data, type: "recovery" });
  if (error) {
    if (error.status === 429) return { status: "error", code: "rate_limited", minutes: 5, typedCode };
    await registerFailure(email);
    return { status: "error", code: "invalid_code", typedCode: "" };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  // Si eligió la misma que ya tenía, igual la recuerda: se sigue como si la hubiera cambiado.
  if (updateError && updateError.code !== "same_password") {
    console.error("updateUser (recuperar) falló", { status: updateError.status, code: updateError.code });
    return { status: "error", code: updateError.code === "weak_password" ? "too_short" : "unknown", typedCode: "" };
  }

  // Las otras sesiones abiertas (otro navegador, otro dispositivo) se cierran.
  await supabase.auth.signOut({ scope: "others" });
  await clearFailures(email);
  await flash("passwordUpdated");
  redirect(await destinationAfterSignIn(supabase, `/${locale}`));
}

// ─── Cambiar la contraseña desde Ajustes ─────────────────────────────────────

export type ChangePasswordState =
  | { status: "idle" }
  | { status: "success"; savedAt: number }
  | ({ status: "error" } & ({ code: "wrong_current" | "missing_current" | PasswordProblem | "unknown" } | RateLimited));

export async function changePassword(_previous: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const user = await getCurrentUser();
  if (!user?.email) return { status: "error", code: "unknown" };
  const current = text(formData, "current_password");
  const password = text(formData, "password");

  if (!current) return { status: "error", code: "missing_current" };
  const problem = passwordProblem(password, user.email);
  if (problem) return { status: "error", code: problem };

  const minutes = await minutesToWait(user.email);
  if (minutes > 0) return { status: "error", code: "rate_limited", minutes };

  const supabase = await createClient();
  // Con require_current_password, Supabase verifica la actual antes de cambiarla.
  const { error } = await supabase.auth.updateUser({ password, current_password: current });
  if (error && error.code !== "same_password") {
    if (error.code === "current_password_invalid" || error.code === "current_password_required") {
      await registerFailure(user.email);
      return { status: "error", code: "wrong_current" };
    }
    if (error.code === "weak_password") return { status: "error", code: "too_short" };
    console.error("updateUser (cambiar) falló", { status: error.status, code: error.code });
    return { status: "error", code: "unknown" };
  }

  await supabase.auth.signOut({ scope: "others" });
  await clearFailures(user.email);
  return { status: "success", savedAt: Date.now() };
}
