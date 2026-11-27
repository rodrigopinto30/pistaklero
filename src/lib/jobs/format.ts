type Salary = {
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  salary_basis: string | null;
};

/** "US$ 1.000–1.500" en el formato del idioma. Null si la oferta no informa sueldo. */
export function formatSalaryRange(job: Salary, locale: string) {
  if (job.salary_min == null || job.salary_max == null || !job.salary_currency) return null;
  const format = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: job.salary_currency,
    maximumFractionDigits: 0,
  });
  return job.salary_min === job.salary_max
    ? format.format(job.salary_min)
    : format.formatRange(job.salary_min, job.salary_max);
}

/** ¿La oferta está vencida? */
export function isExpired(validThrough: string) {
  return new Date(validThrough).getTime() <= Date.now();
}

/** Días que faltan hasta una fecha (al menos 1). */
export function daysUntil(date: string) {
  return Math.max(1, Math.round((new Date(date).getTime() - Date.now()) / 86_400_000));
}
