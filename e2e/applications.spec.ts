import {
  addQuestions,
  expect,
  expectNoA11yViolations,
  jobSlug,
  onboardAsCandidate,
  seedCompanyWithJobs,
  signIn,
  signInAsReadyCandidate,
  test,
  uniqueEmail,
} from "./support/fixtures";

const unique = (label: string) => `${label} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

test("postulación en 1 clic, seguimiento y retiro", async ({ page, browser }) => {
  const title = unique("Frontend simple");
  await seedCompanyWithJobs("Postulaciones SA", [{ title }]);
  const slug = await jobSlug(title);

  // Sin sesión: invita a ingresar y vuelve a la oferta
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`/es/empleos/${slug}`);
  await visitor.getByRole("link", { name: "Ingresá para postularte" }).click();
  await expect(visitor).toHaveURL(new RegExp(`/es/ingresar\\?next=%2Fes%2Fempleos%2F${slug}`));

  await signInAsReadyCandidate(page);
  await page.goto(`/es/empleos/${slug}`);
  await page.getByRole("button", { name: "Postularme" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Tu postulación fue enviada" })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Ya te postulaste:")).toBeVisible();
  await page.getByRole("link", { name: "Ver mis postulaciones" }).click();
  await page.waitForURL("/es/mis-postulaciones");
  const item = page.getByRole("listitem").filter({ hasText: title });
  await expect(item.getByText("Recibida", { exact: true })).toBeVisible();
  await expectNoA11yViolations(page);

  await item.getByRole("button", { name: `Retirar postulación: ${title}` }).click();
  await expect(page.getByRole("listitem").filter({ hasText: title }).getByText("Retirada", { exact: true })).toBeVisible();
});

test("las preguntas filtro se responden en un diálogo accesible", async ({ page }) => {
  const title = unique("Con preguntas");
  await seedCompanyWithJobs("Preguntas SA", [{ title }]);
  const slug = await addQuestions(title);

  await signInAsReadyCandidate(page);
  await page.goto(`/es/empleos/${slug}`);
  await page.getByRole("button", { name: "Postularme" }).click();
  const dialog = page.getByRole("dialog", { name: "Postularme" });
  await expect(dialog).toBeVisible();
  await expectNoA11yViolations(page);

  // Esc cierra y devuelve el foco al botón
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Postularme" })).toBeFocused();

  await page.getByRole("button", { name: "Postularme" }).click();
  await dialog.getByLabel(/¿Por qué te interesa\?/).fill("Me encanta el producto y quiero aprender.");
  await dialog.getByLabel("Avanzado").check();
  await dialog.getByRole("button", { name: "Enviar postulación" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Tu postulación fue enviada" })).toBeVisible();
});

test("con el perfil incompleto se explica qué falta", async ({ page }) => {
  const title = unique("Perfil incompleto");
  await seedCompanyWithJobs("Requisitos SA", [{ title }]);
  const slug = await jobSlug(title);

  await signIn(page, uniqueEmail("incompleta"));
  await onboardAsCandidate(page);
  await page.goto(`/es/empleos/${slug}`);
  await expect(page.getByText("Para postularte, completá tu perfil:")).toBeVisible();
  await expect(page.getByText("Al menos una habilidad")).toBeVisible();
  await expect(page.getByRole("link", { name: "Completar mi perfil" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Postularme" })).toHaveCount(0);
});
