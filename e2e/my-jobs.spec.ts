import { admin, expect, expectNoA11yViolations, expectToast, onboardAsCompany, publishJobFor, signIn, signInAsReadyCandidate, test, uniqueEmail, userIdOf } from "./support/fixtures";

test("Mis ofertas: el cargo, quién publicó, las vistas, los filtros, el resumen y duplicar", async ({ page, browser }) => {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const domain = `misofertas-${run}.com`;
  const companyName = `Mis Ofertas ${run}`;
  const title = `Backend Junior ${run}`;
  await signIn(page, uniqueEmail("rrhh", domain));
  await onboardAsCompany(page, companyName, domain);

  // El cargo se carga en Equipo y aparece al pie de las ofertas.
  await page.goto("/es/panel/equipo");
  await page.getByLabel(/^Tu cargo en la empresa/).fill("Talent Acquisition");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expectToast(page, "Guardamos tu cargo");
  const job = await publishJobFor(companyName, title, { createdBy: await userIdOf(page) });

  // La candidata ve quién la publicó; abrirla dos veces el mismo día cuenta una sola vista.
  const candidate = await (await browser.newContext()).newPage();
  await signInAsReadyCandidate(candidate, "Vio Vistas");
  // (Otros tests en paralelo pueden abrir la oferta más nueva: se compara antes y después.)
  const views = async () => (await admin.from("job_view_days").select("views").eq("job_id", job.id)).data?.reduce((sum, d) => sum + d.views, 0) ?? 0;
  const visit = async () => {
    const beacon = candidate.waitForResponse((r) => r.url().endsWith(`/api/jobs/${job.id}/view`));
    await candidate.goto(`/es/empleos/${job.slug}`);
    await beacon;
  };
  await visit();
  const afterFirst = await views();
  expect(afterFirst).toBeGreaterThanOrEqual(1);
  await visit();
  expect(await views()).toBe(afterFirst);
  const poster = candidate.getByRole("region", { name: "Publicada por" });
  await expect(poster.getByText("Rita Reclutadora")).toBeVisible();
  await expect(poster.getByText(`Talent Acquisition en ${companyName}`)).toBeVisible();

  // En "Mis ofertas" (desde el menú de la cuenta): sus números, filtros y etiquetas.
  await page.goto("/es/panel/ofertas");
  const row = page.getByRole("article").filter({ has: page.getByRole("heading", { name: title }) });
  await expect(row.getByText(/^\d+ vistas?$/)).toHaveText(afterFirst === 1 ? "1 vista" : `${afterFirst} vistas`);
  await expect(row.getByText("Sin postulaciones")).toBeVisible();
  await expect(row.getByText(/por Rita Reclutadora/)).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByLabel("Estado").selectOption("draft");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page.getByText("Ninguna oferta coincide con esos filtros.")).toBeVisible();
  await page.getByRole("navigation", { name: "Filtros aplicados" }).getByRole("link", { name: "Limpiar filtros" }).click();
  await expect(row).toBeVisible();

  // El resumen: números, postulantes por etapa y los días.
  await row.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole("link", { name: "Resumen" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("list", { name: `Números de ${title}` }).getByText(/^\d+ vistas?$/)).toBeVisible();
  await expect(page.getByText("Todavía nadie se postuló.")).toBeVisible();
  await page.getByText("Ver los números por día").click();
  await expect(page.getByRole("table")).toBeVisible();
  await expectNoA11yViolations(page);

  // Duplicar deja una copia como borrador, lista para editar.
  await page.getByRole("button", { name: "Duplicar" }).click();
  await page.waitForURL(/\/es\/panel\/ofertas\/[0-9a-f-]{36}\/editar$/);
  await expectToast(page, "Copiamos la oferta como borrador");
  await expect(page.getByText("Borrador", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("main").getByLabel(/^Puesto/)).toHaveValue(title);
});
