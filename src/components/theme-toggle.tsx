import { Moon, Sun } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { setTheme } from "@/lib/theme/actions";
import { getTheme } from "@/lib/theme/server";
import { Tip } from "@/components/tip";

/*
 * Botón de modo claro: un interruptor (aria-pressed) con un nombre fijo, "Modo claro".
 * El ícono muestra el modo al que se pasa; el nombre accesible no cambia (WCAG 4.1.2).
 */
export async function ThemeToggle() {
  const t = await getTranslations("Layout");
  const theme = await getTheme();
  const isLight = theme === "light";

  return (
    <form action={setTheme}>
      <input type="hidden" name="theme" value={isLight ? "dark" : "light"} />
      <Tip label={t("lightMode")}>
      <button
        type="submit"
        aria-pressed={isLight}
        aria-label={t("lightMode")}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        {isLight ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
      </button>
      </Tip>
    </form>
  );
}
