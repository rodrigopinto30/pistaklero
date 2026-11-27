"use client";

import { Check, Eye, EyeOff, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PASSWORD_RULES, type PasswordProblem, passwordRuleChecks } from "@/lib/validation/auth";

type FieldProps = {
  label: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  error?: string | null;
  /** Ids extra para aria-describedby (por ejemplo, la lista de reglas). */
  describedBy?: string;
  onValueChange?: (value: string) => void;
};

/**
 * Campo de contraseña con botón para mostrarla (WCAG 3.3.8: no obliga a memorizar ni a transcribir).
 * Junto al rótulo, un monito: 🙈 mientras está oculta y 🔭 cuando se ve (decorativo: el botón ya
 * anuncia su estado con aria-pressed). Se puede pegar y lo completan los gestores de contraseñas.
 */
export function PasswordField({ label, name, autoComplete, error, describedBy, onValueChange }: FieldProps) {
  const t = useTranslations("Auth");
  const id = useId();
  const errorId = `${id}-error`;
  const [visible, setVisible] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Después de cada envío React vacía el formulario: lo que se mostraba (reglas, coincidencia) también.
  useEffect(() => {
    const form = input.current?.form;
    if (!form || !onValueChange) return;
    const onReset = () => onValueChange("");
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [onValueChange]);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        {label}
        <span key={String(visible)} aria-hidden="true" className="inline-block animate-in zoom-in-50 duration-200 motion-reduce:animate-none">
          {visible ? "🔭" : "🙈"}
        </span>
      </Label>
      <div className="relative">
        <Input
          ref={input}
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          spellCheck={false}
          autoCapitalize="none"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={[error ? errorId : null, describedBy].filter(Boolean).join(" ") || undefined}
          onChange={(event) => onValueChange?.(event.target.value)}
          className="pr-12"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-controls={id}
          aria-label={t("showPassword")}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </button>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Contraseña nueva + repetirla. Mientras se escribe, la lista de reglas se va tildando en verde y,
 * debajo de la repetición, se avisa si coinciden. Los textos dicen el estado de cada regla
 * ("cumplida" / "falta") para quien usa lector de pantalla, sin anunciar cada tecla.
 */
export function NewPasswordFields({ label, errorCode }: { label: string; errorCode?: string | null }) {
  const t = useTranslations("Password");
  const rulesId = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const checks = passwordRuleChecks(password);

  const problem = (errorCode ?? null) as PasswordProblem | null;
  const passwordError = problem && problem !== "mismatch" ? t(`problems.${problem}`) : null;
  const confirmError = problem === "mismatch" ? t("problems.mismatch") : null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <PasswordField label={label} name="password" autoComplete="new-password" error={passwordError} describedBy={rulesId} onValueChange={setPassword} />
        <ul id={rulesId} aria-label={t("rules.label")} className="grid gap-1 text-sm sm:grid-cols-2">
          {PASSWORD_RULES.map((rule) => (
            <li key={rule} className={cn("flex items-center gap-1.5 transition-colors", checks[rule] ? "text-verified" : "text-muted-foreground")}>
              {checks[rule] ? <Check aria-hidden="true" className="size-4 shrink-0" /> : <span aria-hidden="true" className="size-4 shrink-0 text-center leading-4">·</span>}
              {t(`rules.${rule}`)}
              <span className="sr-only">: {checks[rule] ? t("rules.met") : t("rules.missing")}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-2">
        <PasswordField label={t("repeat")} name="password_confirm" autoComplete="new-password" error={confirmError} onValueChange={setConfirm} />
        {confirm.length > 0 && !confirmError && (
          <p className={cn("flex items-center gap-1.5 text-sm", confirm === password ? "text-verified" : "text-muted-foreground")}>
            {confirm === password ? <Check aria-hidden="true" className="size-4" /> : <X aria-hidden="true" className="size-4" />}
            {confirm === password ? t("matches") : t("doesNotMatch")}
          </p>
        )}
      </div>
    </>
  );
}
