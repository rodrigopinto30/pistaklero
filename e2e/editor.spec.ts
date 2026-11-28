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
  await expect(body).toHaveText(/^Hoy conseguí mi primer trabajo \p{Extended_Pictographic}/u);

  // Los GIFs aparecen solo si el sitio tiene clave de GIPHY (en los tests, no).
  await expect(page.getByRole("button", { name: /Agregar un GIF/ })).toHaveCount(0);
});

test("el editor da formato (negrita, subrayado, color, resaltado y enlace) y se publica tal cual", async ({ page }) => {
  await signInAsReadyCandidate(page, "Fede Formato");
  await page.goto("/es/publicaciones/nueva");
  const title = `Formato ${Date.now().toString(36)}`;
  await page.getByRole("textbox", { name: /^Título/ }).fill(title);
  const body = page.getByRole("textbox", { name: /^Texto/ });
  await body.click();
  await page.keyboard.type("Tres consejos para tu primera entrevista: ");

  // Escribe la palabra y un espacio, la selecciona (sin el espacio) y le da formato: lo que se
  // escriba después ya no lleva ese formato.
  const formatWord = async (word: string, apply: () => Promise<void>) => {
    await page.keyboard.type(`${word} `);
    await page.keyboard.press("ArrowLeft");
    for (let i = 0; i < word.length; i++) await page.keyboard.press("Shift+ArrowLeft");
    await apply();
    await body.click();
    await page.keyboard.press("End");
  };
  const toolbar = page.getByRole("toolbar", { name: "Formato" });
  await formatWord("practicá", () => toolbar.getByRole("button", { name: /^Negrita/ }).click());
  await formatWord("preguntá", () => toolbar.getByRole("button", { name: /^Subrayado/ }).click());
  await formatWord("respirá", async () => {
    await toolbar.getByRole("button", { name: "Color de letra" }).click();
    await page.getByRole("button", { name: "Verde" }).click();
  });
  await formatWord("sonreí", async () => {
    await toolbar.getByRole("button", { name: "Resaltar" }).click();
    await page.getByRole("button", { name: "Amarillo" }).click();
  });
  await formatWord("guía", async () => {
    await toolbar.getByRole("button", { name: "Enlace" }).click();
    await page.getByLabel("Dirección del enlace").fill("acme.com/guia");
    await page.getByRole("button", { name: "Aplicar" }).click();
  });
  await expect(toolbar.getByRole("button", { name: /^Negrita/ })).toHaveAttribute("aria-pressed", "false");
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Publicar" }).click();
  await page.waitForURL(/\/es\/publicaciones\/(?!nueva)/);
  const article = page.getByRole("article");
  await expect(article.locator("strong", { hasText: "practicá" })).toBeVisible();
  await expect(article.locator("u", { hasText: "preguntá" })).toBeVisible();
  await expect(article.locator('span[data-color="green"]', { hasText: "respirá" })).toBeVisible();
  await expect(article.locator('mark[data-highlight="yellow"]', { hasText: "sonreí" })).toBeVisible();
  await expect(article.getByRole("link", { name: "guía" })).toHaveAttribute("href", "https://acme.com/guia");
  await expectNoA11yViolations(page);
});
