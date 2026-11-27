import { expect, expectNoA11yViolations, linkFromEmail, onboardAsCompany, signIn, test, uniqueEmail } from "./support/fixtures";

test("el owner invita, la persona invitada se suma y el equipo se gestiona", async ({ browser }) => {
  const domain = `equipo-${Date.now()}.com`;
  const companyName = `Equipo ${Date.now()}`;
  const invited = uniqueEmail("nueva", domain);

  const owner = await (await browser.newContext()).newPage();
  await signIn(owner, uniqueEmail("owner", domain));
  await onboardAsCompany(owner, companyName, domain);
  await owner.getByRole("link", { name: "Equipo" }).click();
  await owner.waitForURL("/es/panel/equipo");
  await expectNoA11yViolations(owner);

  // Invitar
  const invite = owner.getByRole("region", { name: "Invitar a alguien" });
  await invite.getByLabel(/^Email/).fill(invited);
  await invite.getByRole("button", { name: "Enviar invitación" }).click();
  await expect(invite.getByText("Guardado.")).toBeVisible();
  await expect(owner.getByRole("region", { name: "Invitaciones pendientes" })).toContainText(invited.toLowerCase());

  // La invitada abre el link del email: primero le pide ingresar, después entra al panel
  const acceptLink = await linkFromEmail(invited, "/api/team/accept");
  const member = await (await browser.newContext()).newPage();
  await member.goto(acceptLink);
  await expect(member).toHaveURL(/\/es\/ingresar\?next=/);
  const next = new URL(acceptLink).pathname + new URL(acceptLink).search;
  await signIn(member, invited, next);
  await member.waitForURL("/es/panel");
  await expect(member.getByRole("heading", { level: 1, name: `Panel de ${companyName}` })).toBeVisible();

  // El link no se puede reusar
  await member.goto(acceptLink);
  await expect(member).toHaveURL(/\/es\/invitacion\?error=invalid_invitation/);

  // Un miembro común ve el equipo pero no invita
  await member.goto("/es/panel/equipo");
  await expect(member.getByRole("region", { name: "Miembros" })).toContainText(invited.toLowerCase());
  await expect(member.getByText("Solo los owners pueden invitar o quitar miembros.")).toBeVisible();
  await expect(member.getByRole("region", { name: "Invitar a alguien" })).toHaveCount(0);

  // El owner lo hace owner y después revoca otra invitación
  await owner.reload();
  await owner.getByRole("button", { name: `Hacer owner a ${invited.toLowerCase()}` }).click();
  await expect(owner.getByRole("region", { name: "Miembros" })).toContainText("Owner (administra el equipo)");
  const other = uniqueEmail("otra", domain);
  await invite.getByLabel(/^Email/).fill(other);
  await invite.getByRole("button", { name: "Enviar invitación" }).click();
  await owner.getByRole("button", { name: `Revocar la invitación de ${other.toLowerCase()}` }).click();
  await expect(owner.getByRole("region", { name: "Invitaciones pendientes" })).not.toContainText(other.toLowerCase());
});

test("una invitación no se puede usar con otro email", async ({ browser }) => {
  const domain = `mezcla-${Date.now()}.com`;
  const owner = await (await browser.newContext()).newPage();
  await signIn(owner, uniqueEmail("owner", domain));
  await onboardAsCompany(owner, `Mezcla ${Date.now()}`, domain);
  await owner.goto("/es/panel/equipo");
  const invited = uniqueEmail("invitada", domain);
  await owner.getByRole("region", { name: "Invitar a alguien" }).getByLabel(/^Email/).fill(invited);
  await owner.getByRole("button", { name: "Enviar invitación" }).click();
  await expect(owner.getByText("Guardado.")).toBeVisible();

  const acceptLink = await linkFromEmail(invited, "/api/team/accept");
  const intruder = await (await browser.newContext()).newPage();
  const next = new URL(acceptLink).pathname + new URL(acceptLink).search;
  await signIn(intruder, uniqueEmail("intrusa"), next);
  await expect(intruder).toHaveURL(/\/es\/invitacion\?error=email_mismatch/);
  await expect(intruder.getByRole("alert").filter({ hasText: "la invitación es para otro email" })).toBeVisible();
  await expectNoA11yViolations(intruder);
});
