import { expect, expectNoA11yViolations, jobSlug, seedCompanyWithJobs, signInAsReadyCandidate, test } from "./support/fixtures";

test("por ahora el sitio es solo claro y no ofrece el modo oscuro", async ({ page, context, baseURL }) => {
  // Ni una cookie vieja del modo oscuro lo vuelve a activar.
  await context.addCookies([{ name: "theme", value: "dark", url: baseURL! }]);
  await page.goto("/es");
  await expect(page.locator("html")).toHaveClass(/\blight\b/);
  await expect(page.getByRole("button", { name: "Modo claro" })).toHaveCount(0);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f6f7f4");
});

test("sin la clase en <html> (React la rearma al cambiar de idioma) la página sigue en claro", async ({ page }) => {
  await page.goto("/es");
  const colors = () =>
    page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      primary: getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
    }));
  const withClass = await colors();
  await page.evaluate(() => document.documentElement.classList.remove("light"));
  expect(await colors()).toEqual(withClass);
  expect(withClass.primary).toBe("#3d6b0a");
});

test("el modo claro cumple los contrastes en las páginas principales", async ({ page }) => {
  const title = `Modo claro ${Date.now().toString(36)}`;
  await seedCompanyWithJobs("Clarita", [{ title }]);
  const slug = await jobSlug(title);

  for (const path of ["/es", "/en/sign-in", "/es/legal/privacidad", `/es/empleos/${slug}`, "/es/no-existe"]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveClass(/\blight\b/);
    await expectNoA11yViolations(page);
  }

  // Páginas con sesión: el editor de perfil y los ajustes
  await signInAsReadyCandidate(page);
  for (const path of ["/es/perfil", "/es/ajustes", "/es/mis-postulaciones"]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveClass(/\blight\b/);
    await expectNoA11yViolations(page);
  }
});
