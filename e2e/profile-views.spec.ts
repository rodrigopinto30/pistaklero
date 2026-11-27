import { expect, expectNoA11yViolations, onboardAsCandidate, onboardAsCompany, seedProfileViews, signIn, test, uniqueEmail } from "./support/fixtures";

test("un reclutador ve hasta 200 perfiles por día", async ({ browser }) => {
  // Una candidata con el perfil "solo empresas" (el valor por defecto)
  const candidate = await (await browser.newContext()).newPage();
  await signIn(candidate, uniqueEmail("visible"));
  await onboardAsCandidate(candidate, "Vera Límite");
  const publicHref = await candidate.getByRole("link", { name: "Ver cómo se ve mi perfil" }).getAttribute("href");

  // Sin cuenta, no existe
  const visitor = await (await browser.newContext()).newPage();
  expect((await visitor.goto(publicHref!))?.status()).toBe(404);

  // Un reclutador lo ve
  const recruiter = await (await browser.newContext()).newPage();
  const domain = `vistas-${Date.now()}.com`;
  const recruiterId = await signIn(recruiter, uniqueEmail("rrhh", domain));
  await onboardAsCompany(recruiter, "Vistas SA", domain);
  await recruiter.goto(publicHref!);
  await expect(recruiter.getByRole("heading", { level: 1, name: "Vera Límite" })).toBeVisible();

  // Con 200 perfiles vistos en el día, el siguiente no se muestra
  const other = await (await browser.newContext()).newPage();
  await signIn(other, uniqueEmail("otra"));
  await onboardAsCandidate(other, "Olga Nueva");
  const otherHref = await other.getByRole("link", { name: "Ver cómo se ve mi perfil" }).getAttribute("href");
  await seedProfileViews(recruiterId, 200);

  await recruiter.goto(otherHref!);
  await expect(recruiter.getByRole("heading", { level: 1, name: "Llegaste al límite de perfiles por hoy" })).toBeVisible();
  await expect(recruiter.getByText("Olga Nueva")).toHaveCount(0);
  await expectNoA11yViolations(recruiter);

  // El que ya vio hoy lo sigue viendo
  await recruiter.goto(publicHref!);
  await expect(recruiter.getByRole("heading", { level: 1, name: "Vera Límite" })).toBeVisible();
});
