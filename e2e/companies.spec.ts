import { expect, expectNoA11yViolations, expectToast, fillPersonName, seedCompanyWithJobs, signIn, test, uniqueEmail, clickWhenReady } from "./support/fixtures";

test("explorar empresas, darles me gusta y guardarlas", async ({ page }) => {
  const name = `Exploradora ${Date.now().toString(36)}`;
  await seedCompanyWithJobs(name, [{ title: `Empleo de ${name}` }]);

  // Sin sesión se ven las tarjetas, y el corazón lleva a ingresar.
  await page.goto(`/es/empresas?q=${encodeURIComponent(name)}`);
  const card = page.getByRole("article").filter({ hasText: name });
  await expect(card.getByText("1 empleo abierto", { exact: false })).toBeVisible();
  await expectNoA11yViolations(page);
  await card.getByRole("button", { name: `Ingresá para darle me gusta a ${name}` }).click();
  // Vuelve al mismo listado, con la misma búsqueda.
  await expect(page).toHaveURL(/\/es\/ingresar\?next=%2Fes%2Fempresas%3Fq%3D/);

  // Crea la cuenta: al terminar la bienvenida vuelve a la misma búsqueda, con el me gusta ya hecho.
  await signIn(page, uniqueEmail("exploradora"));
  await page.getByLabel(/Busco trabajo/).check();
  await fillPersonName(page, "Eva Explora");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL(/\/es\/empresas\?q=/);
  await expectToast(page, "Listo: le diste me gusta.");
  await expect(card.getByRole("button", { name: `Me gusta: ${name}` })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByText("1 me gusta", { exact: false })).toBeVisible();

  // Con sesión: me gusta (se saca y se vuelve a dar) y guardar desde la tarjeta.
  await clickWhenReady(card.getByRole("button", { name: `Me gusta: ${name}` }));
  await expect(card.getByRole("button", { name: `Me gusta: ${name}` })).toHaveAttribute("aria-pressed", "false");
  await clickWhenReady(card.getByRole("button", { name: `Me gusta: ${name}` }));
  await expect(card.getByRole("button", { name: `Me gusta: ${name}` })).toHaveAttribute("aria-pressed", "true");
  await clickWhenReady(card.getByRole("button", { name: `Guardar empresa: ${name}` }));
  await expectToast(page, "Empresa guardada. La encontrás en Guardados.");

  // La tarjeta lleva a la página de la empresa, que muestra lo mismo.
  await card.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByRole("button", { name: `Me gusta: ${name}` })).toHaveAttribute("aria-pressed", "true");

  await page.goto("/es/guardados");
  await expect(page.getByRole("article").filter({ hasText: name })).toBeVisible();
});
