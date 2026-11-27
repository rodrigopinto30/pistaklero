import { expect, signIn, test, uniqueEmail } from "./support/fixtures";

test("una candidata elige su rol y queda registrada", async ({ page }) => {
  await signIn(page, uniqueEmail("candidata"));
  await page.waitForURL("/es/bienvenida");

  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Elegí una de las dos opciones.")).toBeVisible();

  await page.getByLabel(/Busco trabajo/).check();
  await expect(page.getByLabel(/Nombre de la empresa/)).toBeHidden();
  await page.getByLabel(/Nombre y apellido/).fill("Ana Pérez");
  await page.getByLabel(/Titular/).fill("Frontend Junior");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.waitForURL("/es/perfil");
  await expect(page.getByRole("link", { name: "Completá tu registro" })).toBeHidden();
  await expect(page.getByRole("link", { name: "Mi perfil", exact: true })).toBeVisible();
});

test("una empresa con email de su dominio, y el mismo dominio no se repite", async ({ browser }) => {
  const domain = `acme-${Date.now()}.com`;

  const first = await (await browser.newContext()).newPage();
  await signIn(first, uniqueEmail("rrhh", domain));
  await first.waitForURL("/es/bienvenida");
  await first.getByLabel(/Busco talento/).check();
  await first.getByLabel(/Sitio web/).fill(domain);
  await first.getByRole("button", { name: "Continuar" }).click();
  await expect(first.getByLabel(/Nombre de la empresa/)).toBeFocused();
  await expect(first.getByLabel(/Sitio web/)).toHaveValue(domain);
  await first.getByLabel(/Nombre de la empresa/).fill("Acme");
  await first.getByRole("button", { name: "Continuar" }).click();
  await first.waitForURL("/es");

  const second = await (await browser.newContext()).newPage();
  await signIn(second, uniqueEmail("otra", domain));
  await second.waitForURL("/es/bienvenida");
  await second.getByLabel(/Busco talento/).check();
  await second.getByLabel(/Nombre de la empresa/).fill("Acme Copia");
  await second.getByLabel(/Sitio web/).fill(`https://www.${domain}`);
  await second.getByRole("button", { name: "Continuar" }).click();
  await expect(second.getByText("Esa empresa ya está en Pistaklero")).toBeVisible();
});
