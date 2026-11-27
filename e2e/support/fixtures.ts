import AxeBuilder from "@axe-core/playwright";
import { test as base, type Browser, type BrowserContext, expect, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";
export const MAILPIT_URL = "http://127.0.0.1:54324";

/** PNG de 1×1 válido y un SVG con script, para probar las subidas de imágenes. */
export const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
export const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Email único por test, para no chocar entre tests en paralelo. */
export function uniqueEmail(prefix: string, domain = "example.com") {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@${domain}`;
}

/**
 * Inicia sesión sin pasar por el email: genera el link mágico con la API de administración
 * (no cuenta para el límite de envíos) y lo abre, igual que si viniera del email.
 */
export async function signIn(page: Page, email: string, next = "/es") {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const params = new URLSearchParams({ token_hash: data.properties.hashed_token, type: "email", next });
  await page.goto(`/api/auth/confirm?${params}`);
  return data.user.id;
}

/** Candidata con el perfil mínimo para postularse (titular, una habilidad y un proyecto). */
export async function signInAsReadyCandidate(page: Page, name = "Ana Pérez", { skills = true } = {}) {
  const userId = await signIn(page, uniqueEmail("lista"));
  await onboardAsCandidate(page, name);
  await admin.from("candidates").update({ headline: "Frontend Junior" }).eq("user_id", userId);
  if (skills) {
    const { data: skill } = await admin.from("skills").select("id").eq("slug", "react").single();
    await admin.from("candidate_skills").insert({ candidate_id: userId, skill_id: skill!.id });
  }
  await admin.from("candidate_projects").insert({ candidate_id: userId, title: "Portfolio" });
  return userId;
}

/** Agrega preguntas filtro a una oferta ya creada. */
export async function addQuestions(jobTitle: string) {
  const { data: job } = await admin.from("jobs").select("id, slug").eq("title", jobTitle).single();
  await admin.from("job_questions").insert([
    { job_id: job!.id, position: 1, type: "short_text" as const, prompt: "¿Por qué te interesa?" },
    { job_id: job!.id, position: 2, type: "single_choice" as const, prompt: "¿Qué nivel de inglés tenés?", options: ["Básico", "Intermedio", "Avanzado"] },
  ]);
  return job!.slug;
}

/** Publica una oferta directamente para una empresa ya creada (por su nombre). */
export async function publishJobFor(companyName: string, title: string) {
  const { data: company } = await admin.from("companies").select("id").eq("name", companyName).single();
  const { data: job, error } = await admin
    .from("jobs")
    .insert({
      company_id: company!.id,
      title,
      description: "Oferta de prueba para la gestión de postulantes.",
      language: "es",
      seniority: "junior",
      employment_type: "full_time",
      work_mode: "remote",
      salary_min: 1000,
      salary_max: 1500,
      salary_currency: "USD",
      salary_period: "month",
      salary_basis: "gross",
      valid_through: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      status: "published",
    })
    .select("id, slug")
    .single();
  if (error) throw error;
  return job!;
}

/** Cuenta de admin nueva (el rol se asigna directo en la base, como hace pnpm admin:grant). */
export async function signInAsAdmin(page: Page) {
  const email = uniqueEmail("admin");
  const userId = await signIn(page, email);
  await admin.from("profiles").insert({ id: userId, role: "admin" });
  return { userId, email };
}

/** Reporte hecho por una cuenta candidata nueva, directo en la base. */
export async function reportJobAs(jobId: string, reason: "scam" | "fake" | "discrimination" | "other" = "scam") {
  const { data: user } = await admin.auth.admin.createUser({ email: uniqueEmail("reporta"), email_confirm: true });
  await admin.from("profiles").insert({ id: user.user!.id, role: "candidate" });
  await admin.from("job_reports").insert({ job_id: jobId, reporter_id: user.user!.id, reason });
}

/** Candidata creada directo en la base (sin pasar por la interfaz). */
export async function seedCandidate(email: string, fullName = "Candidata de prueba") {
  const { data: user, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  await admin.from("profiles").insert({ id: user.user.id, role: "candidate" });
  const [firstName, ...rest] = fullName.split(" ");
  await admin.from("people").insert({ user_id: user.user.id, first_name: firstName, last_name: rest.join(" ") || "Prueba" });
  await admin.from("candidates").insert({ user_id: user.user.id, slug: `seed-${user.user.id.slice(0, 8)}` });
  return user.user.id;
}

/** Postulación con fecha en el pasado, para simular el paso del tiempo. */
export async function seedOldApplication(jobId: string, candidateId: string, daysAgo: number) {
  const when = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  const { error } = await admin.from("applications").insert({ job_id: jobId, candidate_id: candidateId, created_at: when, status_changed_at: when });
  if (error) throw error;
}

/** Empresa sin reclamar con una oferta importada (como si la hubiera cargado el admin). */
export async function seedUnclaimedCompany(name: string, domain: string, jobTitle: string) {
  const { data: company, error } = await admin
    .from("companies")
    .insert({ name, slug: domain.replace(/\W/g, "-"), domain, website_url: `https://${domain}`, status: "unclaimed" })
    .select("id, slug")
    .single();
  if (error) throw error;
  const { error: jobError } = await admin.from("jobs").insert({
    company_id: company.id,
    source: "imported",
    status: "published",
    title: jobTitle,
    summary: "Oferta importada para los tests.",
    language: "es",
    seniority: "junior",
    employment_type: "full_time",
    work_mode: "remote",
    valid_through: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    external_url: `https://${domain}/jobs/1`,
    external_provider: "manual",
  });
  if (jobError) throw jobError;
  return company;
}

/** Simula que un reclutador ya vio `count` perfiles hoy (para probar el límite diario). */
export async function seedProfileViews(viewerId: string, count: number) {
  const run = Date.now().toString(36);
  for (let start = 0; start < count; start += 25) {
    const ids = await Promise.all(
      Array.from({ length: Math.min(25, count - start) }, (_, i) => seedCandidate(`visto.${run}.${start + i}@example.com`, "Perfil visto"))
    );
    const { error } = await admin.from("candidate_profile_views").insert(ids.map((candidate_id) => ({ viewer_id: viewerId, candidate_id })));
    if (error) throw error;
  }
}

export async function projectPreviewPath(candidateId: string, title: string) {
  const { data } = await admin.from("candidate_projects").select("preview_path").eq("candidate_id", candidateId).eq("title", title).single();
  return data?.preview_path ?? null;
}

export async function emailOf(userId: string) {
  const { data } = await admin.auth.admin.getUserById(userId);
  return data.user!.email!;
}

export async function jobSlug(jobTitle: string) {
  const { data } = await admin.from("jobs").select("slug").eq("title", jobTitle).single();
  return data!.slug;
}

type SeedJob = {
  title: string;
  work_mode?: "remote" | "hybrid" | "onsite";
  seniority?: "trainee" | "junior" | "semi_senior" | "senior" | "lead";
  employment_type?: "full_time" | "part_time" | "contract" | "internship" | "freelance";
  salary_currency?: "USD" | "ARS";
  country?: string | null;
  language?: "es" | "en";
};

/**
 * Crea una empresa verificada con ofertas publicadas directamente en la base (clave de admin).
 * Para tests que necesitan datos y no prueban la publicación en sí.
 */
export async function seedCompanyWithJobs(companyName: string, jobs: SeedJob[]) {
  const domain = `seed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.com`;
  const { data: user, error } = await admin.auth.admin.createUser({ email: `rrhh@${domain}`, email_confirm: true });
  if (error) throw error;
  await admin.from("profiles").insert({ id: user.user.id, role: "recruiter" });
  const { data: company } = await admin
    .from("companies")
    .insert({ name: companyName, slug: `${domain.replace(/\W/g, "-")}`, domain, website_url: `https://${domain}`, verified_at: new Date().toISOString() })
    .select("id")
    .single();
  await admin.from("company_members").insert({ company_id: company!.id, user_id: user.user.id, member_role: "owner" });
  const validThrough = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const { error: jobsError } = await admin.from("jobs").insert(
    jobs.map((job) => ({
      company_id: company!.id,
      title: job.title,
      description: "Oferta de prueba para los tests de búsqueda.",
      language: job.language ?? "es",
      seniority: job.seniority ?? "junior",
      employment_type: job.employment_type ?? "full_time",
      work_mode: job.work_mode ?? "remote",
      country: job.work_mode && job.work_mode !== "remote" ? (job.country ?? "AR") : null,
      salary_min: 1000,
      salary_max: 1500,
      salary_currency: job.salary_currency ?? "USD",
      salary_period: "month" as const,
      salary_basis: "gross" as const,
      valid_through: validThrough,
      status: "published" as const,
    }))
  );
  if (jobsError) throw jobsError;
  return company!.id;
}

/** Busca en Mailpit el último email enviado a `email` y devuelve el primer link que contenga `contains`. */
export async function linkFromEmail(email: string, contains: string) {
  let link: string | undefined;
  await expect
    .poll(async () => {
      const search = await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
      const id = search.messages?.[0]?.ID;
      if (!id) return undefined;
      const message = await (await fetch(`${MAILPIT_URL}/api/v1/message/${id}`)).json();
      const hrefs = [...String(message.HTML).matchAll(/href="([^"]+)"/g)].map((m) => m[1]!.replaceAll("&amp;", "&"));
      link = hrefs.find((href) => href.includes(contains));
      return link;
    }, { timeout: 15_000 })
    .toBeTruthy();
  return link!;
}

/**
 * Código de 6 dígitos del último email que recibió `email` cuyo asunto contiene `subject`
 * (confirmar la cuenta o recuperar la contraseña). `after` descarta los emails anteriores.
 */
export async function codeFromEmail(email: string, subject: RegExp, after = new Date(0)) {
  let code: string | undefined;
  await expect
    .poll(async () => {
      const search = await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
      const message = (search.messages ?? []).find(
        (m: { Subject: string; Created: string }) => subject.test(m.Subject) && new Date(m.Created) >= after
      );
      if (!message) return undefined;
      const full = await (await fetch(`${MAILPIT_URL}/api/v1/message/${message.ID}`)).json();
      code = String(full.Text).match(/\b(\d{6})\b/)?.[1];
      return code;
    }, { timeout: 15_000 })
    .toBeTruthy();
  return code!;
}

/** Cuenta con contraseña y email ya confirmado, creada directo con la API de administración. */
export async function createUserWithPassword(email: string, password: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}

/** Contraseña nueva y su repetición (registro, recuperar o cambiar la contraseña). */
export async function fillNewPassword(scope: Page | Locator, password: string, repeat = password, label = /^(Contraseña|Contraseña nueva)$/) {
  await scope.getByRole("textbox", { name: label }).fill(password);
  await scope.getByRole("textbox", { name: "Repetir contraseña" }).fill(repeat);
}

/** Candidata con perfil y contraseña, para entrar por el formulario de ingreso. */
export async function seedCandidateWithPassword(email: string, password: string, fullName = "Candidata de prueba") {
  const userId = await seedCandidate(email, fullName);
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) throw error;
  return userId;
}

/** Ingresa con email y contraseña desde la página de ingreso en la que ya está. */
export async function signInWithPassword(page: Page, email: string, password: string) {
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Contraseña", exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
}

/** Nombre y apellido en la bienvenida ("Nombre" a secas: no "Nombre de la empresa" ni "Segundo nombre"). */
export async function fillPersonName(page: Page, fullName: string) {
  const [firstName, ...rest] = fullName.split(" ");
  await page.getByLabel(/^Nombre(?! de)/).fill(firstName);
  await page.getByLabel(/^Apellido/).fill(rest.join(" ") || "Prueba");
}

/** Completa la bienvenida como candidata desde la página actual. */
export async function onboardAsCandidate(page: Page, fullName = "Ana Pérez") {
  await page.getByLabel(/Busco trabajo/).check();
  await fillPersonName(page, fullName);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL("/es/perfil");
}

/**
 * Completa la bienvenida como empresa desde la página actual. Por defecto también da por terminada
 * el alta de la página de la empresa (para los tests que no la prueban) y deja la página en el panel.
 */
export async function onboardAsCompany(page: Page, companyName: string, website: string, fullName = "Rita Reclutadora", { finishSetup = true } = {}) {
  await page.getByLabel(/Busco talento/).check();
  await fillPersonName(page, fullName);
  await page.getByLabel(/Nombre de la empresa/).fill(companyName);
  await page.getByLabel(/Sitio web/).fill(website);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL("/es/panel/empresa");
  if (finishSetup) {
    await admin.from("companies").update({ setup_completed_at: new Date().toISOString() }).eq("name", companyName);
    await page.goto("/es/panel");
  }
}

/** Abre el menú de la cuenta (foto, nombre y email arriba a la derecha). */
export async function openAccountMenu(page: Page) {
  await page.getByRole("button", { name: /^(Menú de tu cuenta|Your account menu)/ }).click();
  return page.getByRole("menu");
}

/** Sale de la cuenta desde el menú. */
export async function signOutFromMenu(page: Page) {
  const menu = await openAccountMenu(page);
  await menu.getByRole("menuitem", { name: /^(Salir|Sign out)$/ }).click();
  // Espera a que la sesión se haya cerrado de verdad (si no, el próximo goto la cancela).
  await expect(page.getByRole("banner").getByRole("link", { name: /^(Ingresar|Sign in)$/ })).toBeVisible();
}

/** Confirma una acción que no se puede deshacer (el diálogo "¿Seguro?" que abre el botón). */
export async function confirmDialog(page: Page, confirmLabel: string | RegExp = /^Sí, /) {
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: confirmLabel }).click();
}

/** Espera el aviso (toast) con ese texto. Puede haber varios apilados: alcanza con el último. */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByRole("region", { name: /^(Avisos|Notifications)$/ }).getByText(text).last()).toBeVisible();
}

/** Revisa la página con axe: WCAG 2.0, 2.1 y 2.2, niveles A y AA. */
export async function expectNoA11yViolations(page: Page) {
  // Un aviso (toast) que entra o sale tiene colores a medio camino: axe lo mediría con poco contraste.
  // Se espera a que terminen las transiciones y animaciones finitas.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity)
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  // Con el selector de los primeros nodos y el detalle de axe, el fallo se entiende sin abrir la traza.
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.length}) → ${v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} ${n.failureSummary?.split("\n").slice(1, 2).join("") ?? ""}`).join(" | ")}`
  );
  expect(summary, "violaciones de accesibilidad").toEqual([]);
}

/**
 * Espera a que React haya hidratado la página (el layout marca <html data-hydrated>).
 * Antes de eso, los botones que solo funcionan con JavaScript todavía no responden.
 */
export async function waitForHydration(page: Page) {
  await page.locator("html[data-hydrated]").waitFor({ state: "attached", timeout: 20_000 });
}

/**
 * Hace clic cuando React ya tomó ese elemento. El contenido de una página se hidrata por partes:
 * un botón que solo funciona con JavaScript puede no responder aunque el resto de la página ya cargó.
 */
export async function clickWhenReady(locator: Locator) {
  await expect
    .poll(() => locator.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactProps"))), { timeout: 20_000 })
    .toBe(true);
  await locator.click();
}

/**
 * Test con chequeo automático: falla si la página tiene errores de consola o bloqueos de la CSP.
 * Los 404 esperados (por ejemplo, la página de "no encontrado") no cuentan.
 */
/** page.goto espera, además, a que React haya hidratado la página (si la respuesta es HTML). */
function gotoWaitsForHydration(page: Page) {
  const goto = page.goto.bind(page);
  page.goto = async (...args: Parameters<Page["goto"]>) => {
    const response = await goto(...args);
    if (response?.ok() && response.headers()["content-type"]?.includes("text/html")) await waitForHydration(page);
    return response;
  };
  return page;
}

/** Contextos (pestañas con su propia sesión) que abrió el test en curso. */
const extraContexts: BrowserContext[] = [];

export const test = base.extend<{ consoleErrors: string[]; closeExtraContexts: void }, object>({
  // Cada page.goto espera la hidratación (salvo en las pruebas sin JavaScript).
  page: async ({ page, javaScriptEnabled }, provide) => {
    await provide(javaScriptEnabled === false ? page : gotoWaitsForHydration(page));
  },
  // También en las pestañas que abre un test (browser.newContext().newPage()), por ejemplo para tener
  // a la empresa y a la candidata a la vez: si no, un clic podía llegar antes que React.
  browser: [
    async ({ browser }, provide) => {
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async (...args: Parameters<Browser["newContext"]>) => {
        const context = await newContext(...args);
        extraContexts.push(context);
        if (args[0]?.javaScriptEnabled === false) return context;
        const newPage = context.newPage.bind(context);
        context.newPage = async () => gotoWaitsForHydration(await newPage());
        return context;
      };
      await provide(browser);
    },
    { scope: "worker" },
  ],
  // Las pestañas que abrió el test se cierran al terminar: si no, se acumulan en el navegador del
  // worker y la memoria crece hasta que alguna se cae.
  closeExtraContexts: [
    async ({}, use) => {
      await use();
      await Promise.all(extraContexts.splice(0).map((context) => context.close().catch(() => {})));
    },
    { auto: true },
  ],
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (e) =>
          console.error(`CSP bloqueó ${e.violatedDirective}: ${e.blockedURI}`)
        );
      });
      page.on("console", (message) => {
        if (message.type() === "error" && !message.text().includes("status of 404")) {
          errors.push(message.text());
        }
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await use(errors);
      expect(errors, "errores de consola o de CSP").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
