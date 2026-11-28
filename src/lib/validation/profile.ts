import { richText } from "@/lib/editor/text";
import { z } from "zod";
import { COUNTRY_CODES, LANGUAGE_CODES } from "@/lib/geo";
import { optionalHttpsUrl } from "./onboarding";

const optionalText = (max: number) => z.string().trim().max(max);
const requiredText = (max: number, min = 1) => z.string().trim().min(min).max(max);
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

/** "2025-03" (input type="month") → "2025-03-01". */
const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "invalid_month" })
  .transform((value) => `${value}-01`);
const optionalMonth = z.preprocess(emptyToUndefined, month.optional());

export const basicsSchema = z.object({
  headline: optionalText(100),
  bio: richText(500),
  country: z.preprocess(emptyToUndefined, z.enum(COUNTRY_CODES).optional()),
  city: optionalText(80),
  languages: z.array(z.enum(LANGUAGE_CODES)).max(10),
  githubUrl: optionalHttpsUrl,
  linkedinUrl: optionalHttpsUrl,
  websiteUrl: optionalHttpsUrl,
});

export const preferencesSchema = z.object({
  availability: z.enum(["immediate", "two_weeks", "freelance_only", "not_looking"]),
  visibility: z.enum(["companies_only", "public", "hidden"]),
});

export const CURRENCIES = ["USD", "ARS", "EUR", "BRL", "MXN", "CLP", "COP", "UYU"] as const;
export const SALARY_PERIODS = ["hour", "month", "year"] as const;
export const SALARY_BASES = ["gross", "net"] as const;

export const salarySchema = z.object({
  amount: z.coerce.number({ error: "amount_positive" }).positive({ error: "amount_positive" }).max(1_000_000_000),
  currency: z.enum(CURRENCIES),
  period: z.enum(SALARY_PERIODS),
  basis: z.enum(SALARY_BASES),
  salaryVisibility: z.enum(["private", "applied_companies"]),
});

export const SKILL_LEVELS = ["basic", "intermediate", "advanced", "expert"] as const;
export const skillSchema = z.object({
  skillId: z.uuid(),
  level: z.enum(SKILL_LEVELS),
});

/** "on" del checkbox "sigue en curso". */
const checkbox = z.preprocess((value) => value === "on" || value === true, z.boolean());

/**
 * Fin de una experiencia o formación: si sigue en curso no hay fecha de fin; si no, es obligatoria
 * y no puede ser anterior al inicio. Cada caso con su propio mensaje.
 */
function checkPeriod(value: { startDate: string; endDate?: string; current: boolean }, ctx: z.RefinementCtx) {
  if (value.current) return;
  if (!value.endDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "end_required" });
  else if (value.endDate < value.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "end_before_start" });
}
const withoutEndIfCurrent = <T extends { endDate?: string; current: boolean }>(value: T) =>
  value.current ? { ...value, endDate: undefined } : value;

export const entrySchemas = {
  experience: z
    .object({
      companyName: requiredText(80),
      title: requiredText(80),
      startDate: month,
      endDate: optionalMonth,
      current: checkbox,
      description: richText(1000),
    })
    .superRefine(checkPeriod)
    .transform(withoutEndIfCurrent),
  education: z
    .object({
      institution: requiredText(120),
      degree: requiredText(120),
      startDate: month,
      endDate: optionalMonth,
      current: checkbox,
    })
    .superRefine(checkPeriod)
    .transform(withoutEndIfCurrent),
  certification: z.object({
    name: requiredText(120),
    issuer: optionalText(120),
    issuedOn: optionalMonth,
    credentialUrl: optionalHttpsUrl,
  }),
  project: z.object({
    title: requiredText(80),
    description: richText(500),
    url: optionalHttpsUrl,
    repoUrl: optionalHttpsUrl,
  }),
};

export type EntryBlock = keyof typeof entrySchemas;
export const ENTRY_BLOCKS = Object.keys(entrySchemas) as EntryBlock[];
