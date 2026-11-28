import { expect, expectNoA11yViolations, expectToast, onboardAsCandidate, onboardAsCompany, signIn, test, uniqueEmail, clickWhenReady, confirmDialog } from "./support/fixtures";

const unique = (label: string) => `${label} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

test("publicar un consejo, darle like, guardarlo, denunciarlo, editarlo y borrarlo", async ({ page, browser }) => {
  const title = unique("Cómo preparé mi primera entrevista");

  // Una candidata escribe una publicación.
  await signIn(page, uniqueEmail("autora"));
  await onboardAsCandidate(page, "Pili Publica");
  await page.goto("/es/publicaciones");
  await page.getByRole("link", { name: "Escribir una publicación" }).click();
  await page.getByRole("textbox", { name: /^Título/ }).fill("CV");
  await page.getByRole("textbox", { name: /^Texto/ }).fill("Muy corto");
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Tiene que tener al menos 5 caracteres.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Título/ })).toBeFocused();
  await page.getByRole("textbox", { name: /^Título/ }).fill(title);
  await page.getByRole("textbox", { name: /^Texto/ }).fill("Practiqué en voz alta y llevé **dos proyectos** para mostrar.\n\n- Repasé lo básico\n- Pregunté por el equipo");
  // Etiquetas como en dev.to: con o sin #, con Enter o coma; quedan en minúsculas y sin repetir.
  const tagTag = `t${Date.now().toString(36)}`;
  const tags = page.getByRole("textbox", { name: /^Etiquetas/ });
  await tags.fill("#Entrevistas");
  await tags.press("Enter");
  await tags.fill(`${tagTag},entrevistas,`);
  const chosen = page.getByRole("list", { name: "Etiquetas elegidas" });
  await expect(chosen.getByRole("listitem")).toHaveText(["#entrevistas", `#${tagTag}`]);
  await page.getByRole("button", { name: "Publicar" }).click();
  await expectToast(page, "¡Publicado! Ya lo puede leer toda la comunidad.");
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  // Cada etiqueta lleva al listado de esa etiqueta.
  await page.getByRole("list", { name: "Etiquetas" }).getByRole("link", { name: `#${tagTag}` }).click();
  await expect(page.getByText(`Publicaciones con #${tagTag}`)).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: title })).toBeVisible();
  await page.getByRole("article").filter({ hasText: title }).getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole("article").getByText("Pili Publica")).toBeVisible();
  await expectNoA11yViolations(page);

  // Otra persona la ve en el listado intercalado, le da like y la guarda.
  const reader = await (await browser.newContext()).newPage();
  await signIn(reader, uniqueEmail("lectora"));
  await onboardAsCandidate(reader, "Lola Lee");
  await reader.goto(`/es/publicaciones?q=${encodeURIComponent(title)}`);
  const card = reader.getByRole("article").filter({ hasText: title });
  await expect(card.getByText("Pili Publica")).toBeVisible();
  await expectNoA11yViolations(reader);
  await clickWhenReady(card.getByRole("button", { name: `Me gusta: ${title}` }));
  await expect(card.getByRole("button", { name: `Me gusta: ${title}` })).toHaveAttribute("aria-pressed", "true");
  await expect(card.getByText("1 me gusta", { exact: true })).toBeVisible();
  await clickWhenReady(card.getByRole("button", { name: `Guardar publicación: ${title}` }));
  await expectToast(reader, "Publicación guardada. La encontrás en Guardados.");
  await reader.goto("/es/guardados");
  await expect(reader.getByRole("article").filter({ hasText: title })).toBeVisible();

  // La denuncia.
  await reader.goto(`/es/publicaciones?q=${encodeURIComponent(title)}`);
  await reader.getByRole("link", { name: title, exact: true }).click();
  await reader.getByText("Denunciar").click();
  await reader.getByLabel("Es spam o publicidad").check();
  await reader.getByRole("button", { name: "Enviar denuncia" }).click();
  await expect(reader.getByText("Gracias. Si la denuncian más personas", { exact: false })).toBeVisible();

  // La autora la edita y después la borra.
  await page.reload();
  await page.getByRole("link", { name: "Editar" }).click();
  // Sin tocar nada (aunque el texto tenga varias líneas) no hay nada que guardar.
  await page.waitForURL(/\/editar$/);
  await page.goto(page.url());
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("textbox", { name: /^Título/ }).fill(`${title} (editada)`);
  await expect(page.getByRole("button", { name: "Guardar cambios" })).not.toHaveAttribute("aria-disabled");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `${title} (editada)` })).toBeVisible();
  await page.getByRole("button", { name: "Borrar publicación" }).click();
  // Pide confirmación: cancelar no borra nada.
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await page.getByRole("button", { name: "Borrar publicación" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("¿Borrar la publicación?");
  await expect(page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" })).toBeFocused();
  await confirmDialog(page, "Sí, borrar");
  await page.waitForURL("/es/mis-publicaciones");
  await expectToast(page, "Listo, se quitó.");
  // getByRole ignora la página anterior que Next deja montada y oculta.
  await expect(page.getByRole("listitem").filter({ hasText: title })).toHaveCount(0);
});

test("lo que publica un reclutador aparece en la pestaña de su empresa", async ({ page }) => {
  const title = unique("Qué miro en un portfolio");
  await signIn(page, uniqueEmail("recluta"));
  await onboardAsCompany(page, unique("Publicadora"), "", "Rita Recluta");
  await page.goto("/es/publicaciones/nueva");
  await page.getByRole("textbox", { name: /^Título/ }).fill(title);
  await page.getByRole("textbox", { name: /^Texto/ }).fill("Que cada proyecto cuente qué problema resolvió y cómo.");
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  // Su nombre lleva a la empresa, y ahí está la publicación.
  await page.getByRole("link", { name: "Rita Recluta" }).click();
  await page.getByRole("link", { name: /^Publicaciones/ }).last().click();
  await expect(page.getByRole("article").filter({ hasText: title })).toBeVisible();
});

test("sin sesión se leen las publicaciones y el like lleva a ingresar", async ({ page }) => {
  await page.goto("/es/publicaciones");
  await expect(page.getByRole("heading", { level: 1, name: "Publicaciones" })).toBeVisible();
  const first = page.getByRole("article").first();
  if ((await first.count()) > 0) {
    await first.getByRole("button", { name: /^Ingresá para darle me gusta/ }).click();
    await expect(page).toHaveURL(/\/es\/ingresar\?next=%2Fes%2Fpublicaciones/);
  }
});
