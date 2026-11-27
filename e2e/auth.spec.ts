import { expect, MAILPIT_URL, signOutFromMenu, test, uniqueEmail } from "./support/fixtures";

test("ingreso con link mágico real (Mailpit) y salida", async ({ page }) => {
  const email = uniqueEmail("link");
  await page.goto("/es/ingresar");

  await page.getByLabel("Email").fill("no-es-un-email");
  await page.getByRole("button", { name: "Enviarme el link" }).click();
  await expect(page.getByText("Escribí un email válido")).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Enviarme el link" }).click();
  await expect(page.getByText("Revisá tu email")).toBeVisible();

  let link: string | undefined;
  await expect
    .poll(async () => {
      const search = await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
      const id = search.messages?.[0]?.ID;
      if (!id) return undefined;
      const message = await (await fetch(`${MAILPIT_URL}/api/v1/message/${id}`)).json();
      link = message.HTML.match(/href="([^"]*token_hash[^"]*)"/)?.[1]?.replaceAll("&amp;", "&");
      return link;
    })
    .toBeTruthy();

  await page.goto(link!);
  await page.waitForURL("/es/bienvenida");

  const cookies = (await page.context().cookies()).filter((c) => c.name.startsWith("sb-") && !c.name.includes("verifier"));
  expect(cookies.length).toBeGreaterThan(0);
  expect(cookies.every((c) => c.httpOnly), "cookies de sesión HttpOnly").toBe(true);

  await signOutFromMenu(page);
  await expect(page.getByRole("link", { name: "Ingresar" })).toBeVisible();
});

test("un link ya usado o inventado lleva al ingreso con un aviso", async ({ page }) => {
  await page.goto("/api/auth/confirm?token_hash=inventado&next=/es");
  await expect(page).toHaveURL(/\/es\/ingresar\?error=link_expired/);
  await expect(page.getByRole("alert").filter({ hasText: "venció o ya se usó" })).toBeVisible();
});
