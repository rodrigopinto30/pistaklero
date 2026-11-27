import { expect, test } from "./support/fixtures";

test("/ redirige según el idioma del navegador", async ({ browser }) => {
  // El idioma del navegador define la cabecera Accept-Language que recibe el proxy.
  for (const [locale, expected] of [["en-US", "/en"], ["es-AR", "/es"], ["fr-FR", "/es"]]) {
    const context = await browser.newContext({ locale });
    const page = await context.newPage();
    await page.goto("/");
    expect(new URL(page.url()).pathname).toBe(expected);
    await context.close();
  }
});

test("el botón ENG cambia a inglés en la misma página", async ({ page }) => {
  await page.goto("/es/ingresar");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.getByRole("link", { name: "ENG – English" }).click();
  await page.waitForURL("/en/sign-in");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "ESP – Español" })).toBeVisible();
});

test("las URLs que no existen muestran el 404 traducido", async ({ page }) => {
  const response = await page.goto("/en/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn't find this page");
});
