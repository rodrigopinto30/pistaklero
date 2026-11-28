import {
  expect,
  MAILPIT_URL,
  onboardAsCompany,
  publishJobFor,
  seedCandidate,
  seedOldApplication,
  signIn,
  test,
  uniqueEmail,
  expectToast,
} from "./support/fixtures";

async function subjectsTo(email: string) {
  const search = await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
  return (search.messages ?? []).map((m: { Subject: string }) => m.Subject) as string[];
}

test("la tarea diaria recuerda, avisa, cierra y calcula el badge", async ({ page, request }) => {
  const run = Date.now().toString(36);
  const companyName = `Lenta ${run}`;
  const domain = `lenta-${run}.com`;
  const recruiterEmail = uniqueEmail("rrhh", domain);
  await signIn(page, recruiterEmail);
  await onboardAsCompany(page, companyName, domain);
  const job = await publishJobFor(companyName, `Oferta lenta ${run}`);

  const slowEmail = uniqueEmail("espera15");
  const closedEmail = uniqueEmail("espera31");
  const slow = await seedCandidate(slowEmail, "Paula Espera");
  const closed = await seedCandidate(closedEmail, "Rita Olvidada");
  await seedOldApplication(job.id, slow, 15);
  await seedOldApplication(job.id, closed, 31);

  // Sin secreto, la ruta no hace nada
  expect((await request.get("/api/internal/cron")).status()).toBe(401);

  const response = await request.get("/api/internal/cron", { headers: { Authorization: `Bearer ${process.env.OUTBOX_SECRET}` } });
  // Otros tests también corren la tarea en paralelo: el resultado se verifica por los emails y la interfaz.
  expect(response.status()).toBe(200);

  await expect.poll(() => subjectsTo(slowEmail)).toContain(`${companyName} está demorando más de lo habitual`);
  await expect.poll(() => subjectsTo(closedEmail)).toContain(`Novedades de tu postulación: Oferta lenta ${run}`);
  // La de 31 días ya se cerró antes del recordatorio: queda 1 esperando.
  await expect.poll(() => subjectsTo(recruiterEmail)).toContain(`1 postulación(es) esperando a ${companyName}`);

  // La postulación de 31 días quedó cerrada como "Sin respuesta"
  const candidatePage = await page.context().browser()!.newContext().then((c) => c.newPage());
  await signIn(candidatePage, closedEmail, "/es/mis-postulaciones");
  await expect(candidatePage.getByRole("listitem").filter({ hasText: `Oferta lenta ${run}` }).getByText("Sin respuesta", { exact: true }).first()).toBeVisible();

  // El badge se muestra en la búsqueda (con pocas postulaciones, "Nueva en Pistaklero")
  await page.goto(`/es?q=${encodeURIComponent(`lenta ${run}`)}`);
  await expect(page.getByRole("article").filter({ hasText: `Oferta lenta ${run}` }).getByText("Nueva en Pistaklero")).toBeVisible();
});

test("el resumen diario llega a quien lo tiene prendido", async ({ page, request }) => {
  const run = Date.now().toString(36);
  const companyName = `Resumen ${run}`;
  const domain = `resumen-${run}.com`;
  const recruiterEmail = uniqueEmail("rrhh", domain);
  await signIn(page, recruiterEmail);
  await onboardAsCompany(page, companyName, domain);
  const job = await publishJobFor(companyName, `Oferta del resumen ${run}`);
  await seedOldApplication(job.id, await seedCandidate(uniqueEmail("nueva")), 0);

  const response = await request.get("/api/internal/cron", { headers: { Authorization: `Bearer ${process.env.OUTBOX_SECRET}` } });
  expect(response.status()).toBe(200);
  await expect.poll(() => subjectsTo(recruiterEmail)).toContain(`1 postulación nueva en ${companyName}`);

  // Se puede apagar desde Ajustes (que entonces no se manda lo prueba la base, en 16_digest.test.sql)
  await page.goto("/es/ajustes");
  await page.getByLabel(/Emails opcionales/).uncheck();
  await page.getByRole("region", { name: "Preferencias" }).getByRole("button", { name: "Guardar" }).click();
  await expectToast(page, "Cambios guardados.");
  await expect(page.getByLabel(/Emails opcionales/)).not.toBeChecked();
});
