import { expect, expectNoA11yViolations, expectToast, signInAsReadyCandidate, signOutFromMenu, test, confirmDialog } from "./support/fixtures";

test("cada acción se confirma con un aviso chico que se cierra solo", async ({ page }) => {
  await signInAsReadyCandidate(page);
  await page.goto("/es/perfil");

  // Guardar un formulario: aviso, y ya no queda el texto "Guardado." debajo del botón.
  const basics = page.getByRole("region", { name: "Datos básicos" });
  // (Distinto del titular que ya tenía: con el mismo valor no habría nada que guardar.)
  await basics.getByLabel(/Titular/).fill("Frontend Junior · React");
  await basics.getByRole("button", { name: "Guardar" }).click();
  await expectToast(page, "Cambios guardados.");
  await expect(basics.getByText("Guardado.")).toHaveCount(0);

  // El aviso se puede cerrar (el botón aparece al pasar el mouse o al llegar con F6) y si no, se va solo.
  const notifications = page.getByRole("region", { name: "Avisos" });
  await notifications.getByText("Cambios guardados.").hover();
  await notifications.getByRole("button", { name: "Cerrar aviso" }).first().click();
  await expect(notifications.getByText("Cambios guardados.")).toHaveCount(0);
  // Con el puntero encima, los avisos esperan (para poder leerlos): se corre a un costado.
  await page.mouse.move(0, 0);
  await expectNoA11yViolations(page);

  // Una acción sin formulario de estado (quitar una habilidad) avisa desde el servidor.
  const skills = page.getByRole("region", { name: "Habilidades" });
  await skills.getByRole("button", { name: /^Quitar / }).first().click();
  await confirmDialog(page, "Sí, quitar");
  await expectToast(page, "Listo, se quitó.");
  await expect(notifications.getByText("Listo, se quitó.")).toHaveCount(0, { timeout: 15_000 });
});

test("salir de la cuenta avisa en la página siguiente", async ({ page }) => {
  await signInAsReadyCandidate(page);
  await page.goto("/es");
  await signOutFromMenu(page);
  await expectToast(page, "Cerraste sesión. ¡Hasta pronto!");
});
