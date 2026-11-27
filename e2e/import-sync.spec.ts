import { expect, expectNoA11yViolations, signInAsAdmin, test } from "./support/fixtures";

test("el admin agrega un tablero de Greenhouse, ve el resultado y lo pausa", async ({ page }) => {
  const run = Date.now().toString(36);
  const companyName = `Tablero ${run}`;
  // Un identificador que no existe: la sincronización inmediata informa el error sin publicar nada.
  const token = `pistaklero-e2e-${run}`;

  await signInAsAdmin(page);
  await page.goto("/es/admin/importar");
  const sources = page.getByRole("region", { name: "Tableros sincronizados" });
  await sources.getByLabel("Empresa").fill(companyName);
  await sources.getByLabel("Sitio web").fill(`https://tablero-${run}.com`);
  await sources.getByLabel("Sistema").selectOption("greenhouse");
  await sources.getByLabel("Identificador del tablero").fill(token);
  await sources.getByRole("button", { name: "Agregar y sincronizar" }).click();
  await expect(sources.getByRole("status").filter({ hasText: "Tablero agregado." })).toBeVisible({ timeout: 30_000 });

  const item = sources.getByRole("listitem").filter({ hasText: companyName });
  await expect(item).toContainText(token);
  await expect(item).toContainText("sin ofertas abiertas");
  // Sin conexión a internet, el error es otro: los dos dicen qué pasó.
  await expect(item.getByText(/No encontramos ese tablero|El sistema no respondió/)).toBeVisible();
  await expectNoA11yViolations(page);

  // El mismo tablero no se carga dos veces
  await sources.getByLabel("Empresa").fill(companyName);
  await sources.getByLabel("Identificador del tablero").fill(token.toUpperCase());
  await sources.getByRole("button", { name: "Agregar y sincronizar" }).click();
  await expect(sources.getByText("Ese tablero ya está cargado.")).toBeVisible();

  await item.getByRole("button", { name: `Pausar: ${companyName} (Greenhouse)` }).click();
  await expect(item).toContainText("pausado");
  await item.getByRole("button", { name: `Reanudar: ${companyName} (Greenhouse)` }).click();
  await expect(item.getByRole("button", { name: `Pausar: ${companyName} (Greenhouse)` })).toBeVisible();
});

test("la ruta de sincronización exige el secreto", async ({ request }) => {
  expect((await request.get("/api/internal/import-sync")).status()).toBe(401);
  expect((await request.get("/api/internal/import-sync", { headers: { Authorization: "Bearer nope" } })).status()).toBe(401);
});
