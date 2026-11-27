import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/geo";
import { optionalHttpsUrl } from "./onboarding";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;
export const COMPANY_STAGES = ["pre_seed", "seed", "series_a_plus", "bootstrapped", "established"] as const;

export const companyDetailsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(2000),
  industry: z.string().trim().max(60),
  size: z.preprocess(emptyToUndefined, z.enum(COMPANY_SIZES).optional()),
  stage: z.preprocess(emptyToUndefined, z.enum(COMPANY_STAGES).optional()),
  country: z.preprocess(emptyToUndefined, z.enum(COUNTRY_CODES).optional()),
  city: z.string().trim().max(80),
  linkedinUrl: optionalHttpsUrl,
  xUrl: optionalHttpsUrl,
  instagramUrl: optionalHttpsUrl,
});

export const companyWebsiteSchema = z.object({ websiteUrl: optionalHttpsUrl });

/**
 * Logo: hasta 900 KB, PNG, JPEG o WebP (se verifica el contenido real, no la extensión).
 * Queda por debajo del límite de 1 MB de las Server Actions, contando el envoltorio del multipart.
 */
export const LOGO_MAX_BYTES = 900_000;
export const LOGO_FORMATS = ["png", "jpeg", "webp"] as const;
