import { addQuestions, expect, expectNoA11yViolations, expectToast, seedCompanyWithJobs, signInAsReadyCandidate, test, clickWhenReady } from "./support/fixtures";

const token = () => `sv${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

test("guardar y postularse desde la tarjeta, sin abrir la oferta", async ({ page }) => {
  const word = token();
  const simple = `${word} Frontend tarjeta`;
  const withQuestions = `${word} Backend con preguntas`;
  await seedCompanyWithJobs("Tarjetas SA", [{ title: simple }, { title: withQuestions }]);
  await addQuestions(withQuestions);

  await signInAsReadyCandidate(page);
  await page.goto(`/es?q=${word}`);
  const card = page.getByRole("article").filter({ hasText: simple });

  // Guardar: el botón queda presionado y avisa.
  await clickWhenReady(card.getByRole("button", { name: `Guardar ${simple}` }));
  await expectToast(page, "Empleo guardado. Lo encontrás en Guardados.");
  await expect(card.getByRole("button", { name: `Quitar ${simple} de guardados` })).toHaveAttribute("aria-pressed", "true");
  await expectNoA11yViolations(page);

  // Postularse en 1 clic, sin salir de la búsqueda.
  await clickWhenReady(card.getByRole("button", { name: `Postularme rápidamente a ${simple}` }));
  await expectToast(page, `¡Listo! Te postulaste a ${simple}.`);
  await expect(card.getByRole("link", { name: "Te postulaste" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`q=${word}`));

  // Con preguntas: lleva a la oferta con el diálogo abierto.
  await clickWhenReady(page.getByRole("article").filter({ hasText: withQuestions }).getByRole("button", { name: `Postularme rápidamente a ${withQuestions}` }));
  await expect(page.getByRole("dialog", { name: "Postularme" })).toBeVisible();
  await expectToast(page, "Esta oferta tiene preguntas: respondelas para postularte.");

  // En Guardados está la oferta, y se puede sacar.
  await page.goto("/es/guardados");
  const saved = page.getByRole("article").filter({ hasText: simple });
  await expect(saved).toBeVisible();
  await expectNoA11yViolations(page);
  await clickWhenReady(saved.getByRole("button", { name: `Quitar ${simple} de guardados` }));
  await expectToast(page, "Lo sacaste de tus guardados.");
  await page.reload();
  await expect(page.getByText("Todavía no guardaste empleos.", { exact: false })).toBeVisible();
});

test("sin sesión, los botones de la tarjeta llevan a ingresar", async ({ page }) => {
  const title = `${token()} Sin sesión`;
  await seedCompanyWithJobs("Visitas SA", [{ title }]);
  await page.goto(`/es?q=${encodeURIComponent(title)}`);
  // Postularse lleva a ingresar y después a la oferta con el formulario abierto.
  await expect(page.getByRole("link", { name: `Postularme rápidamente a ${title}` })).toHaveAttribute("href", /\/es\/ingresar\?next=%2Fes%2Fempleos%2F.+%3Fpostular%3D1/);
  // Guardar queda pendiente y vuelve a la misma búsqueda.
  await page.getByRole("button", { name: `Ingresá para guardar ${title}` }).click();
  await expect(page).toHaveURL(/\/es\/ingresar\?next=%2Fes%3Fq%3D/);
});

test("sin habilidades se puede postular y se recomienda completarlas", async ({ page }) => {
  const title = `${token()} Sin habilidades`;
  await seedCompanyWithJobs("Habilidades SA", [{ title }]);
  await signInAsReadyCandidate(page, "Sole Sinskills", { skills: false });
  await page.goto(`/es?q=${encodeURIComponent(title)}`);
  await page.getByRole("link", { name: title, exact: true }).click();

  await expect(page.getByText("No es obligatorio, pero las empresas las miran primero.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Postularme rápidamente" }).click();
  await expectToast(page, "¡Listo! Tu postulación fue enviada.");
});
