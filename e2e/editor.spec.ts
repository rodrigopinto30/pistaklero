import { expect, expectNoA11yViolations, signInAsReadyCandidate, test } from "./support/fixtures";

test("el editor suma emojis donde está el cursor (y sin clave de GIPHY no ofrece GIFs)", async ({ page }) => {
  await signInAsReadyCandidate(page, "Emi Emoji");
  await page.goto("/es/publicaciones/nueva");
  const body = page.getByRole("textbox", { name: /^Texto/ });
  await body.fill("Hoy conseguí mi primer trabajo ");

  // El del texto (el título tiene su propia barra, con su propio botón de emoji).
  await page.getByRole("toolbar", { name: /^Formato Texto/ }).getByRole("button", { name: "Agregar un emoji" }).click();
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
  const toolbar = page.getByRole("toolbar", { name: /^Formato Texto/ });
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
    await toolbar.getByRole("button", { name: "Insertar enlace" }).click();
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

test("el título de una publicación admite negrita, color y emojis, y se busca sin el formato", async ({ page }) => {
  await signInAsReadyCandidate(page, "Tina Título");
  await page.goto("/es/publicaciones/nueva");
  const run = Date.now().toString(36);
  const title = page.getByRole("textbox", { name: /^Título/ });
  const toolbar = page.getByRole("toolbar", { name: /^Formato Título/ });
  // Solo el formato del texto: sin títulos, listas, enlaces ni GIFs.
  await expect(toolbar.getByRole("button", { name: /^Negrita/ })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "Insertar enlace" })).toHaveCount(0);
  await expect(toolbar.getByRole("button", { name: /^Lista/ })).toHaveCount(0);

  await title.click();
  await page.keyboard.type("Mi ");
  await page.keyboard.press("Control+b");
  await page.keyboard.type("primer");
  await page.keyboard.press("Control+b");
  await page.keyboard.type(" trabajo ");
  // Color a "trabajo": se selecciona (sin el espacio) y se elige de la paleta.
  await page.keyboard.press("ArrowLeft");
  for (let i = 0; i < "trabajo".length; i++) await page.keyboard.press("Shift+ArrowLeft");
  await toolbar.getByRole("button", { name: "Color de letra" }).click();
  await page.getByRole("button", { name: "Verde" }).click();
  await title.click();
  await page.keyboard.press("End");
  await page.keyboard.type(run);
  // Enter no agrega renglones: el título es una línea.
  await page.keyboard.press("Enter");
  await expect(title.locator("p")).toHaveCount(1);
  await toolbar.getByRole("button", { name: "Agregar un emoji" }).click();
  await page.getByRole("searchbox", { name: "Buscar emoji" }).fill("fiesta");
  await page.getByRole("gridcell").first().click();
  await expect(title).toHaveText(new RegExp(`^Mi primer trabajo ${run}\\p{Extended_Pictographic}`, "u"));
  await page.getByRole("textbox", { name: /^Texto/ }).fill("Conseguí mi primer trabajo gracias a los consejos de la comunidad.");
  await page.getByRole("button", { name: "Publicar" }).click();
  await page.waitForURL(/\/es\/publicaciones\/(?!nueva)/);

  // En la página: con formato; en la pestaña del navegador, sin.
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading.locator("strong", { hasText: "primer" })).toBeVisible();
  await expect(heading.locator('span[data-color="green"]', { hasText: "trabajo" })).toBeVisible();
  await expect(page).toHaveTitle(new RegExp(`^Mi primer trabajo ${run}`));
  await expectNoA11yViolations(page);

  // La búsqueda lo encuentra sin mirar el formato; la tarjeta también lo muestra con formato.
  await page.goto(`/es/publicaciones?q=${encodeURIComponent(`primer trabajo ${run}`)}`);
  const card = page.getByRole("article").filter({ hasText: run });
  await expect(card.locator("strong", { hasText: "primer" })).toBeVisible();
  await expect(card.getByRole("button", { name: new RegExp(`^Me gusta: Mi primer trabajo ${run}`) })).toBeVisible();

  // Al editarla sin tocar nada, no hay nada que guardar.
  await card.getByRole("link", { name: new RegExp(`Mi primer trabajo ${run}`) }).click();
  await page.getByRole("link", { name: "Editar" }).click();
  await page.waitForURL(/\/editar$/);
  await page.goto(page.url());
  await expect(page.getByRole("textbox", { name: /^Título/ }).locator("strong")).toHaveText("primer");
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toHaveAttribute("aria-disabled", "true");
});
