import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";
export const MAILPIT_URL = "http://127.0.0.1:54324";

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
export async function signInAsReadyCandidate(page: Page, name = "Ana Pérez") {
  const userId = await signIn(page, uniqueEmail("lista"));
  await onboardAsCandidate(page, name);
  await admin.from("candidates").update({ headline: "Frontend Junior" }).eq("user_id", userId);
  const { data: skill } = await admin.from("skills").select("id").eq("slug", "react").single();
  await admin.from("candidate_skills").insert({ candidate_id: userId, skill_id: skill!.id });
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

/** Completa la bienvenida como candidata desde la página actual. */
export async function onboardAsCandidate(page: Page, fullName = "Ana Pérez") {
  await page.getByLabel(/Busco trabajo/).check();
  await page.getByLabel(/Nombre y apellido/).fill(fullName);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL("/es/perfil");
}

/** Completa la bienvenida como empresa desde la página actual. */
export async function onboardAsCompany(page: Page, companyName: string, website: string) {
  await page.getByLabel(/Busco talento/).check();
  await page.getByLabel(/Nombre de la empresa/).fill(companyName);
  await page.getByLabel(/Sitio web/).fill(website);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForURL("/es/panel");
}

/** Revisa la página con axe: WCAG 2.0, 2.1 y 2.2, niveles A y AA. */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
  expect(summary, "violaciones de accesibilidad").toEqual([]);
}

/**
 * Test con chequeo automático: falla si la página tiene errores de consola o bloqueos de la CSP.
 * Los 404 esperados (por ejemplo, la página de "no encontrado") no cuentan.
 */
export const test = base.extend<{ consoleErrors: string[] }>({
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
