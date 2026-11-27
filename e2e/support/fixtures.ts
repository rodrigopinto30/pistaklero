import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";
export const MAILPIT_URL = "http://127.0.0.1:54324";

const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Email único por test, para no chocar entre tests en paralelo. */
export function uniqueEmail(prefix: string, domain = "example.com") {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@${domain}`;
}

/**
 * Inicia sesión sin pasar por el email: genera el link mágico con la API de administración
 * (no cuenta para el límite de envíos) y lo abre, igual que si viniera del email.
 */
export async function signIn(page: Page, email: string, next = "/es") {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const params = new URLSearchParams({ token_hash: data.properties.hashed_token, type: "email", next });
  await page.goto(`/api/auth/confirm?${params}`);
}

/** Completa la bienvenida como candidata desde la página actual. */
export async function onboardAsCandidate(page: Page, fullName = "Ana Pérez") {
  await page.getByLabel(/Busco trabajo/).check();
  await page.getByLabel(/Nombre y apellido/).fill(fullName);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL("/es/perfil");
}

/** Completa la bienvenida como empresa desde la página actual. */
export async function onboardAsCompany(page: Page, companyName: string, website: string) {
  await page.getByLabel(/Busco talento/).check();
  await page.getByLabel(/Nombre de la empresa/).fill(companyName);
  await page.getByLabel(/Sitio web/).fill(website);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL("/es/panel");
}

/** Revisa la página con axe: WCAG 2.0, 2.1 y 2.2, niveles A y AA. */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
  expect(summary, "violaciones de accesibilidad").toEqual([]);
}

/**
 * Test con chequeo automático: falla si la página tiene errores de consola o bloqueos de la CSP.
 * Los 404 esperados (por ejemplo, la página de "no encontrado") no cuentan.
 */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (e) =>
          console.error(`CSP bloqueó ${e.violatedDirective}: ${e.blockedURI}`)
        );
      });
      page.on("console", (message) => {
        if (message.type() === "error" && !message.text().includes("status of 404")) {
          errors.push(message.text());
        }
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await use(errors);
      expect(errors, "errores de consola o de CSP").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
