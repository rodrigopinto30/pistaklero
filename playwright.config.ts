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
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    locale: "es-AR",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
