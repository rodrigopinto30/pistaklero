import { expect, expectNoA11yViolations, signInAsReadyCandidate, test } from "./support/fixtures";

test("el editor suma emojis donde está el cursor (y sin clave de GIPHY no ofrece GIFs)", async ({ page }) => {
  await signInAsReadyCandidate(page, "Emi Emoji");
  await page.goto("/es/publicaciones/nueva");
  const body = page.getByLabel(/^Texto/);
  await body.fill("Hoy conseguí mi primer trabajo ");

  await page.getByRole("button", { name: "Agregar un emoji" }).click();
  const search = page.getByRole("searchbox", { name: "Buscar emoji" });
  await expect(search).toBeVisible();
  await expectNoA11yViolations(page);
  await search.fill("fiesta");
  await page.getByRole("gridcell").first().click();
  await expect(body).toHaveValue(/^Hoy conseguí mi primer trabajo \p{Extended_Pictographic}/u);

  // Los GIFs aparecen solo si el sitio tiene clave de GIPHY (en los tests, no).
  await expect(page.getByRole("button", { name: /Agregar un GIF/ })).toHaveCount(0);
});
