import { z } from "zod";
import {
  cityFromText,
  cleanTitle,
  countryFromText,
  detectLanguage,
  htmlToText,
  inferSeniority,
  isoCountry,
  mapEmploymentType,
  safeHttpsUrl,
  salary,
  type SalaryPeriod,
  summarize,
  type SyncedJob,
  type WorkMode,
  workModeFromText,
} from "./normalize";

/*
 * Clientes de las APIs públicas de tableros de empleo. Ninguna necesita credenciales.
 * - Greenhouse: https://developers.greenhouse.io/job-board.html
 * - Lever:      https://github.com/lever/postings-api
 * - Ashby:      https://developers.ashbyhq.com/docs/public-job-posting-api
 * - Workable:   widget público de cada cuenta (apply.workable.com)
 * Cada respuesta se valida con Zod; una oferta mal formada se saltea sin frenar el resto.
 */
export const PROVIDERS = ["greenhouse", "lever", "ashby", "workable"] as const;
export type Provider = (typeof PROVIDERS)[number];

/** Identificador público del tablero: también es parte de la URL, así que solo caracteres seguros. */
export const BOARD_TOKEN = /^[A-Za-z0-9_.-]{1,100}$/;
export const MAX_JOBS_PER_BOARD = 500;

export type BoardError = "invalid_token" | "not_found" | "unavailable" | "invalid_response";
export type BoardResult = { ok: true; jobs: SyncedJob[]; skipped: number } | { ok: false; code: BoardError };

const text = z.string().nullish();

const greenhouseJob = z.object({
  id: z.union([z.number(), z.string()]),
  title: z.string(),
  absolute_url: z.string(),
  content: text,
  language: text,
  location: z.object({ name: text }).nullish(),
  offices: z.array(z.object({ name: text, location: text })).nullish(),
});

const leverJob = z.object({
  id: z.string(),
  text: z.string(),
  hostedUrl: z.string(),
  descriptionPlain: text,
  descriptionBodyPlain: text,
  openingPlain: text,
  additionalPlain: text,
  country: text,
  workplaceType: text,
  categories: z.object({ commitment: text, location: text }).nullish(),
  salaryRange: z.object({ min: z.number().nullish(), max: z.number().nullish(), currency: text, interval: text }).nullish(),
});

const ashbySalary = z.object({
  compensationType: text,
  interval: text,
  currencyCode: text,
  minValue: z.number().nullish(),
  maxValue: z.number().nullish(),
});
const ashbyJob = z.object({
  id: z.string(),
  title: z.string(),
  jobUrl: z.string(),
  location: text,
  isListed: z.boolean().nullish(),
  isRemote: z.boolean().nullish(),
  workplaceType: text,
  employmentType: text,
  descriptionPlain: text,
  address: z.object({ postalAddress: z.object({ addressCountry: text, addressLocality: text }).nullish() }).nullish(),
  compensation: z.object({ compensationTiers: z.array(z.object({ components: z.array(ashbySalary).nullish() })).nullish() }).nullish(),
});

const workableJob = z.object({
  shortcode: z.string(),
  title: z.string(),
  url: z.string(),
  description: text,
  employment_type: text,
  experience: text,
  telecommuting: z.boolean().nullish(),
  country: text,
  city: text,
  locations: z.array(z.object({ countryCode: text, city: text })).nullish(),
});

function base(title: string, body: string, language?: string | null) {
  const summary = summarize(body);
  return {
    title: cleanTitle(title),
    summary,
    language: language === "es" || language === "en" ? language : detectLanguage(`${title}\n${body}`),
  } as const;
}

function finish(job: Omit<SyncedJob, "url"> & { url: string | null }): SyncedJob | null {
  if (!job.url || job.title.length < 3) return null;
  // Presencial o híbrida necesita país (igual que en las ofertas nativas).
  if (job.workMode !== "remote" && !job.country) return null;
  return { ...job, url: job.url, city: job.workMode === "remote" ? null : job.city };
}

const PERIODS: Record<string, SalaryPeriod> = {
  "per-year-salary": "year",
  "per-month-salary": "month",
  "per-hour-wage": "hour",
  "1 YEAR": "year",
  "1 MONTH": "month",
  "1 HOUR": "hour",
};

const normalizers: { [P in Provider]: { url: (token: string) => string; list: (body: unknown) => unknown[] | null; job: (raw: unknown) => SyncedJob | null } } = {
  greenhouse: {
    url: (token) => `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`,
    list: (body) => z.object({ jobs: z.array(z.unknown()) }).safeParse(body).data?.jobs ?? null,
    job(raw) {
      const parsed = greenhouseJob.safeParse(raw);
      if (!parsed.success) return null;
      const j = parsed.data;
      const where = [j.location?.name, ...(j.offices ?? []).map((o) => o.location ?? o.name)].filter(Boolean).join(" · ");
      const workMode: WorkMode = workModeFromText(j.location?.name) ?? "onsite";
      const body = htmlToText(j.content ?? "");
      return finish({
        externalId: String(j.id),
        url: safeHttpsUrl(j.absolute_url),
        ...base(j.title, body, j.language),
        seniority: inferSeniority(j.title),
        employmentType: mapEmploymentType(j.title),
        workMode,
        country: countryFromText(j.offices?.[0]?.location) ?? countryFromText(j.location?.name) ?? countryFromText(where),
        city: cityFromText(j.offices?.[0]?.location ?? j.location?.name),
      });
    },
  },
  lever: {
    url: (token) => `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`,
    list: (body) => z.array(z.unknown()).safeParse(body).data ?? null,
    job(raw) {
      const parsed = leverJob.safeParse(raw);
      if (!parsed.success) return null;
      const j = parsed.data;
      const range = j.salaryRange;
      return finish({
        externalId: j.id,
        url: safeHttpsUrl(j.hostedUrl),
        ...base(j.text, j.descriptionPlain || j.descriptionBodyPlain || j.openingPlain || j.additionalPlain || ""),
        seniority: inferSeniority(j.text),
        employmentType: mapEmploymentType(j.categories?.commitment, j.text),
        workMode: workModeFromText(j.workplaceType) ?? workModeFromText(j.categories?.location) ?? "onsite",
        country: isoCountry(j.country) ?? countryFromText(j.categories?.location),
        city: cityFromText(j.categories?.location),
        ...salary(range?.min, range?.max, range?.currency, PERIODS[range?.interval ?? ""] ?? null),
      });
    },
  },
  ashby: {
    url: (token) => `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}?includeCompensation=true`,
    list: (body) => z.object({ jobs: z.array(z.unknown()) }).safeParse(body).data?.jobs ?? null,
    job(raw) {
      const parsed = ashbyJob.safeParse(raw);
      if (!parsed.success || parsed.data.isListed === false) return null;
      const j = parsed.data;
      const pay = (j.compensation?.compensationTiers ?? []).flatMap((tier) => tier.components ?? []).find((c) => c.compensationType === "Salary");
      const address = j.address?.postalAddress;
      return finish({
        externalId: j.id,
        url: safeHttpsUrl(j.jobUrl),
        ...base(j.title, j.descriptionPlain ?? ""),
        seniority: inferSeniority(j.title),
        employmentType: mapEmploymentType(j.employmentType, j.title),
        workMode: workModeFromText(j.workplaceType) ?? (j.isRemote ? "remote" : (workModeFromText(j.location) ?? "onsite")),
        country: countryFromText(address?.addressCountry) ?? countryFromText(j.location),
        city: address?.addressLocality?.slice(0, 80) || cityFromText(j.location),
        ...salary(pay?.minValue, pay?.maxValue, pay?.currencyCode, PERIODS[pay?.interval ?? ""] ?? null),
      });
    },
  },
  workable: {
    url: (token) => `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(token)}?details=true`,
    list: (body) => z.object({ jobs: z.array(z.unknown()) }).safeParse(body).data?.jobs ?? null,
    job(raw) {
      const parsed = workableJob.safeParse(raw);
      if (!parsed.success) return null;
      const j = parsed.data;
      const location = j.locations?.[0];
      return finish({
        externalId: j.shortcode,
        url: safeHttpsUrl(j.url),
        ...base(j.title, htmlToText(j.description ?? "")),
        seniority: inferSeniority(j.title, j.experience),
        employmentType: mapEmploymentType(j.employment_type, j.title),
        workMode: j.telecommuting ? "remote" : "onsite",
        country: isoCountry(location?.countryCode) ?? countryFromText(j.country),
        city: (location?.city ?? j.city)?.slice(0, 80) || null,
      });
    },
  },
};

/** Baja y normaliza las ofertas publicadas de un tablero. `fetchImpl` se reemplaza en los tests. */
export async function fetchBoard(provider: Provider, token: string, fetchImpl: typeof fetch = fetch): Promise<BoardResult> {
  if (!BOARD_TOKEN.test(token)) return { ok: false, code: "invalid_token" };
  const normalizer = normalizers[provider];

  let response: Response;
  try {
    response = await fetchImpl(normalizer.url(token), {
      headers: { Accept: "application/json", "User-Agent": "Pistaklero job board sync" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    return { ok: false, code: "unavailable" };
  }
  if (response.status === 404) return { ok: false, code: "not_found" };
  if (!response.ok) return { ok: false, code: "unavailable" };

  const body: unknown = await response.json().catch(() => undefined);
  const list = normalizer.list(body);
  if (!list) return { ok: false, code: "invalid_response" };

  const raw = list.slice(0, MAX_JOBS_PER_BOARD);
  const jobs = raw.map((item) => normalizer.job(item)).filter((job): job is SyncedJob => job !== null);
  return { ok: true, jobs, skipped: raw.length - jobs.length };
}
