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

test("la barra de scroll tiene su lugar reservado y abrir el menú de la cuenta no corre nada", async ({ page }) => {
  await signInAsReadyCandidate(page, "Estable Pérez");
  await page.goto("/es");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarGutter)).toBe("stable");
  const positions = () =>
    page.evaluate(() => [document.querySelector("[data-home-link]")!, document.querySelector("main")!].map((el) => el.getBoundingClientRect().x));
  const before = await positions();
  await openAccountMenu(page);
  expect(await positions()).toEqual(before);
});

test("mientras carga una página, el pie queda fuera de la vista", async ({ page }) => {
  await page.goto("/es/accesibilidad");
  const main = (await page.locator("main").boundingBox())!;
  expect(main.height).toBeGreaterThanOrEqual(page.viewportSize()!.height);
});

test("ingresar entra en la pantalla: sin espacio de sobra, con el pie a la vista y 'Volver' lejos del formulario", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  for (const path of ["/es/ingresar", "/es/registro", "/es/recuperar-contrasena"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1), `${path} sin scroll`).toBe(true);
    await expect(page.getByRole("contentinfo")).toBeInViewport();
    const back = (await page.getByRole("link", { name: "Volver", exact: true }).boundingBox())!;
    const title = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
    expect(title.y - (back.y + back.height), `${path}: distancia entre Volver y el título`).toBeGreaterThan(40);
  }
  // Al ir a otra página, el main vuelve a medir al menos una pantalla.
  await page.getByRole("contentinfo").getByRole("link", { name: "Accesibilidad" }).click();
  await page.waitForURL(/accesibilidad/);
  expect((await page.locator("main").boundingBox())!.height).toBeGreaterThanOrEqual(900);
});
