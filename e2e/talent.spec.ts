import { expect, expectNoA11yViolations, onboardAsCompany, seedCandidate, signIn, signInAsReadyCandidate, test, uniqueEmail } from "./support/fixtures";

test("las empresas exploran talento; las candidatas no ven la pestaña", async ({ page, browser }) => {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const visible = `Tala Visible${run}`;
  await seedCandidate(uniqueEmail("talento"), visible);

  // Una candidata no ve la pestaña ni puede entrar.
  const candidate = await (await browser.newContext()).newPage();
  await signInAsReadyCandidate(candidate, "Cami Candidata");
  await expect(candidate.getByRole("navigation", { name: "Secciones" }).first().getByRole("link", { name: "Talento" })).toHaveCount(0);
  await candidate.goto("/es/talento");
  await expect(candidate).toHaveURL("/es");

  // La empresa sí: busca por nombre desde el buscador del encabezado.
  const domain = `talento-${run}.com`;
  await signIn(page, uniqueEmail("rrhh", domain));
  await onboardAsCompany(page, `Busca Talento ${run}`, domain);
  await page.getByRole("navigation", { name: "Secciones" }).first().getByRole("link", { name: "Talento" }).click();
  await expect(page).toHaveURL("/es/talento");
  await expect(page.getByRole("heading", { level: 1, name: "Talento" })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.getByRole("searchbox", { name: "Nombre, puesto o habilidad" }).fill(`Visible${run}`);
  await page.getByRole("searchbox", { name: "Nombre, puesto o habilidad" }).press("Enter");
  await expect(page.getByRole("status")).toHaveText(`1 perfil para «Visible${run}»`);
  await page.getByRole("link", { name: visible }).click();
  await expect(page.getByRole("heading", { level: 1, name: visible })).toBeVisible();
});
