import { expect, onboardAsCompany, seedCandidate, signIn, signInAsReadyCandidate, test, uniqueEmail } from "./support/fixtures";

test("'Volver' lleva a donde estaba (con los filtros) y, si se entró directo, a la sección", async ({ page }) => {
  await signInAsReadyCandidate(page, "Vera Volver");
  await page.goto("/es?remote=1");
  await page.getByRole("main").getByRole("article").first().getByRole("link").first().click();
  await expect(page).toHaveURL(/\/es\/empleos\//);
  await page.getByRole("link", { name: "Volver", exact: true }).click();
  await expect(page).toHaveURL("/es?remote=1");

  // Entrando directo a una oferta (sin historial en el sitio), va al listado.
  const href = await page.getByRole("main").getByRole("article").first().getByRole("link").first().getAttribute("href");
  const fresh = await page.context().newPage();
  await fresh.goto(href!);
  await fresh.getByRole("link", { name: "Volver", exact: true }).click();
  await expect(fresh).toHaveURL("/es");
});

test("los filtros aplicados se ven como etiquetas y se limpian de una vez", async ({ page }) => {
  await page.goto("/es?q=react&remote=1&mode=hybrid");
  const applied = page.getByRole("navigation", { name: "Filtros aplicados" });
  await expect(applied.getByRole("link", { name: /^Quitar el filtro/ })).toHaveCount(3);
  await applied.getByRole("link", { name: "Quitar el filtro «react»" }).click();
  await expect(page).toHaveURL(/\/es\?remote=1&mode=hybrid$/);
  await applied.getByRole("link", { name: "Limpiar filtros" }).click();
  await expect(page).toHaveURL("/es");
  await expect(page.getByRole("navigation", { name: "Filtros aplicados" })).toHaveCount(0);

  // Lo mismo en Empresas y Publicaciones.
  await page.goto("/es/empresas?q=zzz");
  await page.getByRole("navigation", { name: "Filtros aplicados" }).getByRole("link", { name: "Limpiar filtros" }).click();
  await expect(page).toHaveURL("/es/empresas");
  await page.goto("/es/publicaciones?tag=ia");
  await page.getByRole("navigation", { name: "Filtros aplicados" }).getByRole("link", { name: "Quitar el filtro Publicaciones con #ia" }).click();
  await expect(page).toHaveURL("/es/publicaciones");
});

test("Talento muestra sus filtros como etiquetas", async ({ page }) => {
  await seedCandidate(uniqueEmail("chip"), "Chip Filtro");
  const domain = `chips-${Date.now()}.com`;
  await signIn(page, uniqueEmail("rrhh", domain));
  await onboardAsCompany(page, `Chips ${Date.now()}`, domain);
  await page.goto("/es/talento?availability=immediate&q=chip");
  const applied = page.getByRole("navigation", { name: "Filtros aplicados" });
  await expect(applied.getByRole("link", { name: "Quitar el filtro Inmediata" })).toBeVisible();
  await applied.getByRole("link", { name: "Quitar el filtro «chip»" }).click();
  await expect(page).toHaveURL("/es/talento?availability=immediate");
});
