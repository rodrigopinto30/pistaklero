import { expect, expectToast, onboardAsCompany, publishJobFor, signIn, signInAsReadyCandidate, test, uniqueEmail } from "./support/fixtures";

test("una oferta propia puede recibir las postulaciones en otro sitio y la candidata lleva el registro", async ({ page, browser }) => {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const companyName = `Portal ${run}`;
  const domain = `portal-${run}.com`;
  const title = `Analista externo ${run}`;

  // La empresa elige "En otro sitio" y carga el link de su portal.
  await signIn(page, uniqueEmail("rrhh", domain));
  await onboardAsCompany(page, companyName, domain);
  const job = await publishJobFor(companyName, title);
  await page.goto(`/es/panel/ofertas/${job.id}`);
  const apply = page.getByRole("group", { name: "¿Dónde se postulan?" });
  await expect(page.getByRole("group", { name: "Preguntas filtro" })).toBeVisible();
  await apply.getByRole("radio", { name: "En otro sitio" }).check();
  // Las preguntas filtro son de la postulación en Pistaklero: desaparecen.
  await expect(page.getByRole("group", { name: "Preguntas filtro" })).toHaveCount(0);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByLabel(/Link para postularse/)).toBeFocused();
  await page.getByLabel(/Link para postularse/).fill(`${domain}/trabaja-con-nosotros`);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expectToast(page, "Oferta guardada.");

  // La candidata ve "Postularme" (afuera) en vez de la postulación rápida.
  const candidate = await (await browser.newContext()).newPage();
  await candidate.context().route(`https://${domain}/**`, (route) => route.fulfill({ body: "Portal de la empresa" }));
  await signInAsReadyCandidate(candidate, "Eli Externa");
  await candidate.goto(`/es?q=${encodeURIComponent(title)}`);
  const card = candidate.getByRole("article").filter({ hasText: title });
  await expect(card.getByRole("link", { name: `Postularme a ${title} en el sitio de la empresa (se abre en una pestaña nueva)` })).toBeVisible();
  await expect(card.getByRole("button", { name: /Postularme rápidamente/ })).toHaveCount(0);

  await card.getByRole("link", { name: title, exact: true }).click();
  await expect(candidate.getByRole("button", { name: "Postularme rápidamente" })).toHaveCount(0);
  const [portal] = await Promise.all([
    candidate.waitForEvent("popup"),
    candidate.getByRole("link", { name: /^Postularme \(en el sitio de la empresa/ }).click(),
  ]);
  await expect(portal).toHaveURL(`https://${domain}/trabaja-con-nosotros`);
  // Se postula allá y vuelve: "¿Te postulaste?"
  await candidate.waitForTimeout(3200);
  await portal.close();
  await candidate.bringToFront();
  await candidate.evaluate(() => window.dispatchEvent(new Event("focus")));
  const question = candidate.getByRole("dialog", { name: /¿Te postulaste\?/ });
  await expect(question).toContainText(title);
  await question.getByRole("button", { name: "Sí, me postulé" }).click();
  await expectToast(candidate, "la sumamos a Mis postulaciones");

  await candidate.goto("/es/mis-postulaciones");
  const elsewhere = candidate.getByRole("region", { name: "En otros sitios" });
  await expect(elsewhere.getByRole("link", { name: title })).toBeVisible();
  await expect(elsewhere).toContainText(companyName);
});
