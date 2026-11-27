import { expect, expectNoA11yViolations, expectToast, onboardAsCandidate, seedCompanyWithJobs, signIn, test, uniqueEmail } from "./support/fixtures";

test("explorar empresas, darles me gusta y guardarlas", async ({ page }) => {
  const name = `Exploradora ${Date.now().toString(36)}`;
  await seedCompanyWithJobs(name, [{ title: `Empleo de ${name}` }]);

  // Sin sesión se ven las tarjetas, y el corazón lleva a ingresar.
  await page.goto(`/es/empresas?q=${encodeURIComponent(name)}`);
  const card = page.getByRole("article").filter({ hasText: name });
  await expect(card.getByText("1 empleo abierto", { exact: false })).toBeVisible();
  await expectNoA11yViolations(page);
  await card.getByRole("link", { name: `Ingresá para darle me gusta a ${name}` }).click();
  await expect(page).toHaveURL(/\/es\/ingresar\?next=%2Fes%2Fempresas%2F/);

  // Con sesión: me gusta y guardar desde la tarjeta.
  await signIn(page, uniqueEmail("exploradora"));
  await onboardAsCandidate(page, "Eva Explora");
  await page.goto(`/es/empresas?q=${encodeURIComponent(name)}`);
  await card.getByRole("button", { name: `Me gusta: ${name}` }).click();
  await expect(card.getByRole("button", { name: `Me gusta: ${name}` })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByText("1 me gusta", { exact: false })).toBeVisible();
  await card.getByRole("button", { name: `Guardar empresa: ${name}` }).click();
  await expectToast(page, "Empresa guardada. La encontrás en Guardados.");

  // La tarjeta lleva a la página de la empresa, que muestra lo mismo.
  await card.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByRole("button", { name: `Me gusta: ${name}` })).toHaveAttribute("aria-pressed", "true");

  await page.goto("/es/guardados");
  await expect(page.getByRole("article").filter({ hasText: name })).toBeVisible();
});
