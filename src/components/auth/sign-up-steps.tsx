import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

/** Pasos del registro: qué buscás → tu email → tus datos. El actual lleva aria-current="step". */
export async function SignUpSteps({ current }: { current: 1 | 2 | 3 }) {
  const t = await getTranslations("SignUp.steps");
  const steps = [t("role"), t("account"), t("details")];

  return (
    <nav aria-label={t("label")}>
      <ol className="flex items-center gap-2 text-sm">
        {steps.map((label, index) => {
          const number = index + 1;
          const done = number < current;
          const active = number === current;
          return (
            <li key={label} aria-current={active ? "step" : undefined} className={cn("flex min-w-0 flex-1 items-center gap-2", active && "max-sm:flex-[2]")}>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  active && "bg-primary text-primary-foreground",
                  done && "bg-primary/15 text-primary",
                  !active && !done && "bg-secondary text-muted-foreground"
                )}
              >
                {done ? <Check aria-hidden="true" className="size-4" /> : number}
              </span>
              {/* En pantallas chicas solo se lee el nombre del paso actual (los otros quedan para lectores de pantalla). */}
              <span className={cn("truncate", active ? "font-medium" : "text-muted-foreground max-sm:sr-only")}>
                {done && <span className="sr-only">{t("done")} </span>}
                {label}
              </span>
              {number < steps.length && <span aria-hidden="true" className="h-px flex-1 bg-border" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
