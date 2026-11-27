import { z } from "zod";
import { COUNTRY_CODES, LANGUAGE_CODES } from "@/lib/geo";
import { optionalHttpsUrl } from "./onboarding";

const optionalText = (max: number) => z.string().trim().max(max);
const requiredText = (max: number, min = 1) => z.string().trim().min(min).max(max);
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

/** "2025-03" (input type="month") → "2025-03-01". */
const month = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .transform((value) => `${value}-01`);
const optionalMonth = z.preprocess(emptyToUndefined, month.optional());

export const basicsSchema = z.object({
  fullName: requiredText(80, 2),
  headline: optionalText(100),
  bio: optionalText(500),
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
  amount: z.coerce.number().positive().max(1_000_000_000),
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

const endAfterStart = <T extends { startDate: string; endDate?: string }>(value: T) =>
  !value.endDate || value.endDate >= value.startDate;

export const entrySchemas = {
  experience: z
    .object({
      companyName: requiredText(80),
      title: requiredText(80),
      startDate: month,
      endDate: optionalMonth,
      description: optionalText(1000),
    })
    .refine(endAfterStart, { path: ["endDate"] }),
  education: z
    .object({
      institution: requiredText(120),
      degree: requiredText(120),
      startDate: month,
      endDate: optionalMonth,
    })
    .refine(endAfterStart, { path: ["endDate"] }),
  certification: z.object({
    name: requiredText(120),
    issuer: optionalText(120),
    issuedOn: optionalMonth,
    credentialUrl: optionalHttpsUrl,
  }),
  project: z.object({
    title: requiredText(80),
    description: optionalText(500),
    url: optionalHttpsUrl,
    repoUrl: optionalHttpsUrl,
  }),
};

export type EntryBlock = keyof typeof entrySchemas;
export const ENTRY_BLOCKS = Object.keys(entrySchemas) as EntryBlock[];
