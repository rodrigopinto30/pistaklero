import { expect, expectNoA11yViolations, jobSlug, seedCompanyWithJobs, signInAsReadyCandidate, test } from "./support/fixtures";

test("el botón de modo claro cambia el tema y lo recuerda", async ({ page }) => {
  await page.goto("/es");
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  const toggle = page.getByRole("button", { name: "Modo claro" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await toggle.click();
  await expect(page.locator("html")).toHaveClass(/\blight\b/);
  await expect(page.getByRole("button", { name: "Modo claro" })).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\blight\b/);
  // El inglés usa el mismo tema
  await page.getByRole("link", { name: "ENG – English" }).click();
  await expect(page.getByRole("button", { name: "Light mode" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Light mode" }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
});

test("el modo claro cumple los contrastes en las páginas principales", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "theme", value: "light", url: baseURL! }]);
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
