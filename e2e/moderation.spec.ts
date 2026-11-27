import {
  emailOf,
  expect,
  expectNoA11yViolations,
  onboardAsCandidate,
  publishJobFor,
  reportJobAs,
  seedCompanyWithJobs,
  signIn,
  signInAsAdmin,
  test,
  uniqueEmail,
} from "./support/fixtures";

test("tres reportes ocultan una oferta y el admin la revisa", async ({ page, browser }) => {
  const companyName = `Sospechosa ${Date.now()}`;
  await seedCompanyWithJobs(companyName, []);
  const title = `Gana dinero fácil ${Date.now().toString(36)}`;
  const job = await publishJobFor(companyName, title);
  await reportJobAs(job.id, "scam");
  await reportJobAs(job.id, "fake");

  // El tercer reporte, desde la interfaz
  await signIn(page, uniqueEmail("vigilante"));
  await onboardAsCandidate(page);
  await page.goto(`/es/empleos/${job.slug}`);
  await page.getByText("Reportar esta oferta").click();
  await page.getByLabel(/Parece una estafa/).check();
  await page.getByLabel(/Contanos más/).fill("Piden una transferencia para empezar.");
  await page.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Gracias por avisar" })).toBeVisible();

  const visitor = await (await browser.newContext()).newPage();
  expect((await visitor.goto(`/es/empleos/${job.slug}`))?.status()).toBe(404);

  // El admin la revisa y descarta los reportes
  const adminPage = await (await browser.newContext()).newPage();
  await signInAsAdmin(adminPage);
  await adminPage.goto("/es/admin");
  const report = adminPage.getByRole("listitem").filter({ hasText: title });
  await expect(report).toContainText("3 reportes");
  await expect(report).toContainText("Piden una transferencia para empezar.");
  await expectNoA11yViolations(adminPage);
  await report.getByRole("button", { name: `Descartar reportes: ${title}` }).click();
  await expect(adminPage.getByRole("listitem").filter({ hasText: title })).toHaveCount(0);
  expect((await visitor.goto(`/es/empleos/${job.slug}`))?.status()).toBe(200);

  // Suspender la empresa oculta sus ofertas
  await adminPage.getByLabel("Nombre de la empresa").fill(companyName);
  await adminPage.getByRole("region", { name: "Empresas" }).getByRole("button", { name: "Buscar" }).click();
  await adminPage.getByRole("button", { name: `Suspender: ${companyName}` }).click();
  await expect(adminPage.getByRole("button", { name: `Reactivar: ${companyName}` })).toBeVisible();
  expect((await visitor.goto(`/es/empleos/${job.slug}`))?.status()).toBe(404);
  await adminPage.getByRole("button", { name: `Reactivar: ${companyName}` }).click();
  await expect(adminPage.getByRole("button", { name: `Suspender: ${companyName}` })).toBeVisible();
  expect((await visitor.goto(`/es/empleos/${job.slug}`))?.status()).toBe(200);
});

test("una cuenta suspendida ve el aviso", async ({ browser }) => {
  const candidate = await (await browser.newContext()).newPage();
  const candidateId = await signIn(candidate, uniqueEmail("suspendida"));
  await onboardAsCandidate(candidate);
  const email = await emailOf(candidateId);

  const adminPage = await (await browser.newContext()).newPage();
  await signInAsAdmin(adminPage);
  await adminPage.goto(`/es/admin?cuenta=${encodeURIComponent(email)}`);
  await adminPage.getByRole("button", { name: `Suspender: ${email}` }).click();
  await expect(adminPage.getByRole("button", { name: `Reactivar: ${email}` })).toBeVisible();

  await candidate.reload();
  await expect(candidate.getByRole("alert").filter({ hasText: "Tu cuenta está suspendida" })).toBeVisible();
});

test("una cuenta que no es admin no entra al panel de admin", async ({ page }) => {
  await signIn(page, uniqueEmail("curiosa"));
  await onboardAsCandidate(page);
  await page.goto("/es/admin");
  await expect(page).toHaveURL("/es");
});
