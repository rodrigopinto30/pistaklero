import { expect, expectNoA11yViolations, expectToast, onboardAsCompany, seedCandidate, signIn, signInAsReadyCandidate, test, uniqueEmail } from "./support/fixtures";

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

  // La guarda desde la tarjeta: queda en "Perfiles guardados" del equipo, con quién la guardó.
  await page.getByRole("button", { name: `Guardar el perfil de ${visible}` }).click();
  await expectToast(page, "Guardamos el perfil");
  await expect(page.getByRole("button", { name: `Quitar a ${visible} de guardados` })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/es/guardados");
  const savedPeople = page.getByRole("region", { name: "Perfiles guardados" });
  await expect(savedPeople.getByRole("heading", { name: visible })).toBeVisible();
  await expect(savedPeople.getByText("Guardado por Rita Reclutadora")).toBeVisible();
  await expectNoA11yViolations(page);

  // En su perfil, el botón muestra que ya está guardada (y se puede quitar).
  await savedPeople.getByRole("link", { name: visible, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: visible })).toBeVisible();
  const saveButton = page.getByRole("button", { name: "Guardado" });
  await expect(saveButton).toHaveAttribute("aria-pressed", "true");
  await saveButton.click();
  await expectToast(page, "Lo quitamos de guardados");
  await page.goto("/es/guardados");
  await expect(page.getByText("Todavía no guardaron perfiles.")).toBeVisible();
});
