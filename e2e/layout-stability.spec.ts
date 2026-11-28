import { expect, openAccountMenu, signInAsReadyCandidate, test } from "./support/fixtures";

// Cambiar de vista o abrir el menú no tiene que mover la página.

test("el encabezado mide lo mismo en todas las secciones", async ({ page }) => {
  const heights: number[] = [];
  for (const path of ["/es", "/es/empresas", "/es/publicaciones", "/es/accesibilidad"]) {
    await page.goto(path);
    heights.push((await page.locator("header").first().boundingBox())!.height);
  }
  expect(new Set(heights).size, `altos: ${heights.join(", ")}`).toBe(1);
});

test("la barra de scroll tiene su lugar reservado y el menú de la cuenta no bloquea el scroll", async ({ page }) => {
  await signInAsReadyCandidate(page, "Estable Pérez");
  await page.goto("/es");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarGutter)).toBe("stable");
  await openAccountMenu(page);
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");
});

test("mientras carga una página, el pie queda fuera de la vista", async ({ page }) => {
  await page.goto("/es/accesibilidad");
  const main = (await page.locator("main").boundingBox())!;
  expect(main.height).toBeGreaterThanOrEqual(page.viewportSize()!.height);
});
