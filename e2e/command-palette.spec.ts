import type { Locator, Page } from "@playwright/test";
import { expect, expectNoA11yViolations, signInAsReadyCandidate, test } from "./support/fixtures";

/** El atajo funciona una vez que la página hidrata: reintenta hasta que el diálogo abre. */
async function openWithShortcut(page: Page, dialog: Locator, keys = "Control+k") {
  await expect(async () => {
    await page.keyboard.press(keys);
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass();
}

test("Ctrl+K abre la búsqueda rápida y busca empleos", async ({ page }) => {
  await page.goto("/es/legal/terminos");
  const dialog = page.getByRole("dialog", { name: "Búsqueda rápida" });
  await expect(dialog).toBeHidden();

  await openWithShortcut(page, dialog);
  await expect(dialog.getByRole("searchbox", { name: "Buscar empleos" })).toBeFocused();
  await expectNoA11yViolations(page);

  // Esc cierra y el foco vuelve a la página
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // También se abre con el botón (y con ⌘K en Mac)
  const opener = page.getByRole("button", { name: "Búsqueda rápida" });
  await opener.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await page.keyboard.press("Meta+k");
  await expect(dialog).toBeVisible();

  await dialog.getByRole("searchbox", { name: "Buscar empleos" }).fill("react");
  await page.keyboard.press("Enter");
  await page.waitForURL("/es?q=react");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("searchbox", { name: /Buscar empleos|Puesto/ }).first()).toHaveValue("react");
});

test("los accesos de la búsqueda rápida dependen del rol", async ({ page }) => {
  await page.goto("/en");
  await openWithShortcut(page, page.getByRole("dialog", { name: "Quick search" }));
  const guest = page.getByRole("dialog", { name: "Quick search" }).getByRole("navigation", { name: "Go to" });
  await expect(guest.getByRole("link")).toHaveText(["Home", "Companies", "Posts", "Sign in", "Create account"]);
  await page.keyboard.press("Escape");

  await signInAsReadyCandidate(page);
  await page.goto("/es");
  await openWithShortcut(page, page.getByRole("dialog", { name: "Búsqueda rápida" }));
  const nav = page.getByRole("dialog", { name: "Búsqueda rápida" }).getByRole("navigation", { name: "Ir a" });
  await expect(nav.getByRole("link")).toHaveText(["Inicio", "Empresas", "Publicaciones", "Mis postulaciones", "Guardados", "Mi perfil", "Mis publicaciones", "Ajustes"]);
  await nav.getByRole("link", { name: "Mis postulaciones" }).click();
  await page.waitForURL("/es/mis-postulaciones");
  await expect(page.getByRole("dialog", { name: "Búsqueda rápida" })).toBeHidden();
});
