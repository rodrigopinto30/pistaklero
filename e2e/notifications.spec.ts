import { clickWhenReady, expect, expectNoA11yViolations, onboardAsCandidate, signIn, test, uniqueEmail } from "./support/fixtures";

test("la campana avisa y lleva a las notificaciones", async ({ page, browser }) => {
  const title = `Aviso de me gusta ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

  // La autora publica.
  await signIn(page, uniqueEmail("autora-avisos"));
  await onboardAsCandidate(page, "Nora Notifica");
  await expect(page.getByRole("link", { name: "Notificaciones", exact: true })).toBeVisible();
  await page.goto("/es/publicaciones/nueva");
  await page.getByLabel(/^Título/).fill(title);
  await page.getByLabel(/^Texto/).fill("Un consejo para probar que los me gusta avisan.");
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  // Otra persona le da me gusta.
  const reader = await (await browser.newContext()).newPage();
  await signIn(reader, uniqueEmail("lectora-avisos"));
  await onboardAsCandidate(reader, "Lía Lectora");
  await reader.goto(`/es/publicaciones?q=${encodeURIComponent(title)}`);
  await clickWhenReady(reader.getByRole("article").filter({ hasText: title }).getByRole("button", { name: new RegExp(`^Me gusta: ${title}`) }));

  // La campana lo cuenta (al recargar o al volver a la pestaña) y lleva a la sección.
  await page.reload();
  const bell = page.getByRole("link", { name: "Notificaciones: 1 sin leer" });
  await expect(bell).toBeVisible();
  await bell.click();
  await expect(page).toHaveURL("/es/notificaciones");
  await expect(page.getByText(`A alguien le gustó tu publicación «${title}».`)).toBeVisible();
  await expectNoA11yViolations(page);
  // Al abrirla quedan leídas: la campana vuelve a cero.
  await expect(page.getByRole("link", { name: "Notificaciones", exact: true })).toBeVisible();
  await page.getByText(`A alguien le gustó tu publicación «${title}».`).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
});
