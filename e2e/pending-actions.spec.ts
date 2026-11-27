import {
  codeFromEmail,
  expect,
  expectToast,
  fillNewPassword,
  fillPersonName,
  seedCandidateWithPassword,
  seedCompanyWithJobs,
  signInWithPassword,
  test,
  uniqueEmail,
} from "./support/fixtures";

const token = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

test("sin sesión, el me gusta queda pendiente y se hace solo al ingresar", async ({ page }) => {
  const name = `Pendiente ${token()}`;
  await seedCompanyWithJobs(name, [{ title: `Empleo de ${name}` }]);
  const email = uniqueEmail("pendiente");
  await seedCandidateWithPassword(email, "Frase-De-La-Candidata-1", "Pía Pendiente");

  await page.goto(`/es/empresas?q=${encodeURIComponent(name)}`);
  const card = page.getByRole("article").filter({ hasText: name });
  await card.getByRole("button", { name: `Ingresá para darle me gusta a ${name}` }).click();
  await expect(page).toHaveURL(/\/es\/ingresar/);

  await signInWithPassword(page, email, "Frase-De-La-Candidata-1");
  // Vuelve a la misma búsqueda, con el me gusta hecho y avisado.
  await page.waitForURL(/\/es\/empresas\?q=Pendiente/);
  await expectToast(page, "Listo: le diste me gusta.");
  await expect(card.getByRole("button", { name: `Me gusta: ${name}` })).toHaveAttribute("aria-pressed", "true");

  // Un segundo intento pendiente del mismo me gusta no lo apaga (prender, nunca alternar).
  await page.context().clearCookies();
  await page.goto(`/es/empresas?q=${encodeURIComponent(name)}`);
  await card.getByRole("button", { name: `Ingresá para darle me gusta a ${name}` }).click();
  await signInWithPassword(page, email, "Frase-De-La-Candidata-1");
  await expectToast(page, "Listo: le diste me gusta.");
  await expect(card.getByRole("button", { name: `Me gusta: ${name}` })).toHaveAttribute("aria-pressed", "true");
});

test("sin cuenta: guardar un empleo, crear la cuenta y volver con el empleo guardado", async ({ page }) => {
  const title = `Guardable ${token()}`;
  await seedCompanyWithJobs("Pendientes SA", [{ title }]);
  const email = uniqueEmail("nueva");

  await page.goto(`/es?q=${encodeURIComponent(title)}`);
  await page.getByRole("button", { name: `Ingresá para guardar ${title}` }).click();
  await page.getByRole("link", { name: "Creá tu cuenta" }).click();
  await page.getByRole("link", { name: /Busco trabajo/ }).click();

  const created = new Date(Date.now() - 1000);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await fillNewPassword(page, "Mi-Frase-Para-Guardar-1");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.getByLabel("Código de 6 dígitos").fill(await codeFromEmail(email, /confirmar el email/, created));
  await page.getByRole("button", { name: "Confirmar" }).click();

  await page.waitForURL(/\/es\/bienvenida\?role=candidate/);
  await fillPersonName(page, "Nina Nueva");
  await page.getByRole("button", { name: "Continuar" }).click();

  // Termina de crear la cuenta y vuelve a la búsqueda, con el empleo ya guardado.
  await page.waitForURL(/\/es\?q=/);
  await expectToast(page, "Listo: quedó en Guardados.");
  await page.goto("/es/guardados");
  await expect(page.getByRole("article").filter({ hasText: title })).toBeVisible();
});
