import { expect, expectNoA11yViolations, onboardAsCompany, signIn, test, uniqueEmail } from "./support/fixtures";

test("una plantilla completa el formulario y la oferta se publica", async ({ page }) => {
  const domain = `plantillas-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.com`;
  await signIn(page, uniqueEmail("rrhh", domain));
  await onboardAsCompany(page, "Plantillas SA", domain);
  await page.goto("/es/panel/ofertas/nueva");

  const templates = page.getByRole("navigation", { name: "Empezar con una plantilla" });
  await templates.getByRole("link", { name: "Data Analyst Jr" }).click();
  await page.waitForURL("/es/panel/ofertas/nueva?plantilla=data-analyst-jr");
  await expect(templates.getByRole("link", { name: "Data Analyst Jr" })).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("main").getByLabel(/^Puesto/)).toHaveValue("Data Analyst Jr");
  await expect(page.getByLabel(/^Descripción/)).toHaveValue(/Escribir consultas SQL/);
  await expect(page.getByLabel("SQL", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Power BI", { exact: true })).toBeChecked();
  await expect(page.getByLabel("React", { exact: true })).not.toBeChecked();
  await expectNoA11yViolations(page);

  // Cambiar de plantilla rearma el formulario
  await templates.getByRole("link", { name: "Desarrollador/a Frontend Junior" }).click();
  await page.waitForURL("/es/panel/ofertas/nueva?plantilla=frontend-junior");
  await expect(page.getByRole("main").getByLabel(/^Puesto/)).toHaveValue("Desarrollador/a Frontend Junior");
  await expect(page.getByLabel("React", { exact: true })).toBeChecked();
  await expect(page.getByLabel("SQL", { exact: true })).not.toBeChecked();

  // Solo falta el sueldo
  await page.getByLabel(/^Mínimo/).fill("900");
  await page.getByLabel(/^Máximo/).fill("1300");
  await page.getByRole("button", { name: "Publicar" }).click();
  await page.waitForURL(/\/es\/panel\/ofertas\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Publicada", { exact: true }).filter({ visible: true })).toBeVisible();

  // "Empezar de cero" vacía el formulario
  await page.goto("/es/panel/ofertas/nueva?plantilla=sdr");
  await templates.getByRole("link", { name: "Empezar de cero" }).click();
  await page.waitForURL("/es/panel/ofertas/nueva");
  await expect(page.getByRole("main").getByLabel(/^Puesto/)).toHaveValue("");
});
