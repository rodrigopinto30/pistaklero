/*
 * Normalización de ofertas de tableros externos (Greenhouse, Lever, Ashby, Workable) al formato de Pistaklero.
 * Todo lo que llega de afuera se trata como texto no confiable: se le sacan las etiquetas HTML y se recorta.
 */
export type Seniority = "trainee" | "junior" | "semi_senior" | "senior" | "lead";
export type EmploymentType = "full_time" | "part_time" | "contract" | "internship" | "freelance";
export type WorkMode = "remote" | "hybrid" | "onsite";
export type Currency = "USD" | "ARS" | "EUR" | "BRL" | "MXN" | "CLP" | "COP" | "UYU";
export type SalaryPeriod = "hour" | "month" | "year";

/** Lo que recibe sync_import_source. */
export type SyncedJob = {
  externalId: string;
  title: string;
  url: string;
  summary: string;
  language: "es" | "en";
  seniority: Seniority;
  employmentType: EmploymentType;
  workMode: WorkMode;
  country: string | null;
  city: string | null;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: Currency;
  salaryPeriod?: SalaryPeriod;
};

export const SUMMARY_MAX = 400;

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#")) {
      const code = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** HTML (a veces escapado como entidades, como en Greenhouse) → texto plano con un párrafo por línea. */
export function htmlToText(html: string) {
  const source = /&lt;\/?[a-z]/i.test(html) ? decodeEntities(html) : html;
  const text = source
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|ul|ol|tr)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ");
  return decodeEntities(text)
    .split("\n")
    .map((line) => line.replace(/[\s ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** Resumen breve propio (no copiamos la descripción entera): un párrafo, cortado en una palabra. */
export function summarize(text: string, max = SUMMARY_MAX) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export function cleanTitle(title: string) {
  const clean = decodeEntities(title).replace(/\s+/g, " ").trim();
  return clean.length > 100 ? `${clean.slice(0, 99).trimEnd()}…` : clean;
}

const ES_WORDS = /\b(el|la|los|las|del|y|para|con|que|una|por|equipo|empresa|experiencia|buscamos|vas|sumate|trabajo|conocimientos)\b/gi;
const EN_WORDS = /\b(the|and|of|to|for|with|you|we|our|team|company|experience|work|are|will|looking)\b/gi;

export function detectLanguage(text: string): "es" | "en" {
  const sample = text.slice(0, 4000);
  const es = sample.match(ES_WORDS)?.length ?? 0;
  const en = sample.match(EN_WORDS)?.length ?? 0;
  return es > en ? "es" : "en";
}

export function inferSeniority(...hints: (string | null | undefined)[]): Seniority {
  const text = hints.filter(Boolean).join(" ").toLowerCase();
  if (/\b(intern|internship|pasant[ií]a|pasante|trainee|becari[oa]|apprentice)\b/.test(text)) return "trainee";
  if (/\b(semi[\s-]?senior|ssr|mid[\s-]?level|mid)\b/.test(text)) return "semi_senior";
  if (/\b(junior|jr|entry[\s-]?level|graduate)\b/.test(text)) return "junior";
  if (/\b(lead|principal|staff|head of|director|vp|l[ií]der|jefe|jefa|gerente)\b/.test(text)) return "lead";
  if (/\b(senior|sr)\b/.test(text)) return "senior";
  return "semi_senior";
}

export function mapEmploymentType(...hints: (string | null | undefined)[]): EmploymentType {
  const text = hints.filter(Boolean).join(" ").toLowerCase();
  if (/intern|pasant/.test(text)) return "internship";
  if (/freelanc/.test(text)) return "freelance";
  if (/contract|temporary|\btemp\b|contrato/.test(text)) return "contract";
  if (/part[\s-]?time|medio tiempo|media jornada/.test(text)) return "part_time";
  return "full_time";
}

export function workModeFromText(text: string | null | undefined): WorkMode | null {
  if (!text) return null;
  if (/hybrid|h[ií]brido/i.test(text)) return "hybrid";
  if (/remote|remoto|anywhere/i.test(text)) return "remote";
  if (/on[\s-]?site|in[\s-]?office|presencial/i.test(text)) return "onsite";
  return null;
}

// ---------------------------------------------------------------------------
// Países
// ---------------------------------------------------------------------------

const NOT_COUNTRIES = new Set(["EU", "EZ", "UN", "ZZ", "QO"]);
const US_STATES = new Set(
  "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split(" ")
);
const CA_PROVINCES = new Set("AB BC MB NB NL NS NT NU ON PE QC SK YT".split(" "));
const ALIASES: Record<string, string> = {
  usa: "US", "u.s.": "US", "u.s.a.": "US", "united states of america": "US", eeuu: "US", "ee.uu.": "US",
  uk: "GB", "u.k.": "GB", england: "GB", scotland: "GB", wales: "GB", "northern ireland": "GB",
};

/** Región canónica: los alias viejos de ICU ("UK", "SU", "DD"…) pasan a su código actual ("GB", "RU", "DE"). */
function canonicalRegion(code: string) {
  try {
    return new Intl.Locale(`und-${code}`).region ?? null;
  } catch {
    return null;
  }
}

const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

let namesIndex: Map<string, string> | null = null;
function countryNames() {
  if (namesIndex) return namesIndex;
  namesIndex = new Map(Object.entries(ALIASES));
  for (const locale of ["en", "es"]) {
    const names = new Intl.DisplayNames([locale], { type: "region", fallback: "none" });
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        if (NOT_COUNTRIES.has(code) || canonicalRegion(code) !== code) continue;
        const name = names.of(code);
        if (name && name !== code && !namesIndex.has(fold(name))) namesIndex.set(fold(name), code);
      }
    }
  }
  return namesIndex;
}

/** Código ISO de un campo que ya es un código de país (Lever, Workable). */
export function isoCountry(code: string | null | undefined) {
  const upper = code?.trim().toUpperCase();
  const canonical = upper && /^[A-Z]{2}$/.test(upper) ? canonicalRegion(upper) : null;
  if (!canonical || NOT_COUNTRIES.has(canonical)) return null;
  return new Intl.DisplayNames(["en"], { type: "region", fallback: "none" }).of(canonical) ? canonical : null;
}

/** Código ISO a partir de un nombre ("Germany", "España") o de una ubicación ("Austin, TX", "Berlin, Germany"). */
export function countryFromText(value: string | null | undefined) {
  if (!value) return null;
  const parts = value.split(/[,·|/()]|\s[-–]\s/).map((part) => part.trim()).filter(Boolean);
  for (const part of parts.reverse()) {
    const byName = countryNames().get(fold(part));
    if (byName) return byName;
    if (US_STATES.has(part)) return "US";
    if (CA_PROVINCES.has(part)) return "CA";
  }
  return null;
}

/** Primera parte de una ubicación, si no es un país ni "Remote". */
export function cityFromText(value: string | null | undefined) {
  const first = value?.split(/[,·|]|\s[-–]\s/)[0]?.trim();
  if (!first || workModeFromText(first) || countryFromText(first)) return null;
  return first.slice(0, 80);
}

// ---------------------------------------------------------------------------
// Sueldo: solo si cumple las mismas reglas que una oferta nativa
// ---------------------------------------------------------------------------

const CURRENCIES = new Set<Currency>(["USD", "ARS", "EUR", "BRL", "MXN", "CLP", "COP", "UYU"]);

export function salary(min: unknown, max: unknown, currency: unknown, period: SalaryPeriod | null) {
  const lo = Number(min);
  const hi = Number(max);
  const code = typeof currency === "string" ? (currency.toUpperCase() as Currency) : null;
  if (!period || !code || !CURRENCIES.has(code) || !Number.isFinite(lo) || !Number.isFinite(hi)) return {};
  if (lo <= 0 || lo > hi || hi > lo * 3 || hi >= 1e10) return {};
  return { salaryMin: lo, salaryMax: hi, salaryCurrency: code, salaryPeriod: period };
}

/** Solo enlaces https: es adonde mandamos a la gente a postularse. */
export function safeHttpsUrl(value: string | null | undefined) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
