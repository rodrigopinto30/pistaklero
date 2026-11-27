import { defineConfig, devices } from "@playwright/test";

/*
 * Tests de punta a punta contra el entorno de ./start.sh (app + Supabase local).
 * Se corren con ./e2e.sh, en el contenedor oficial de Playwright.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // El servidor de desarrollo compila cada página a pedido: con muchos workers se satura.
  workers: 3,
  timeout: 60_000,
  // Con la suite en paralelo, el servidor de desarrollo puede tardar más en compilar y responder.
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  // Un reintento en local: el servidor de desarrollo a veces responde 500 a sus propios recursos internos
  // mientras compila. Playwright igual los informa como "flaky", así que no quedan escondidos.
  retries: process.env.CI ? 2 : 1,
  // Si el servidor de desarrollo queda roto, todo falla por timeout: mejor cortar temprano que esperar 20 minutos.
  maxFailures: process.env.CI ? 0 : 5,
  // En la CI, además, cada fallo queda como anotación en la corrida.
  reporter: [
    ...(process.env.CI ? [["github"] as const] : []),
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    locale: "es-AR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
