/** "hace 2 días" / "2 days ago" a partir de una fecha. */
export function timeAgo(date: string, locale: string) {
  const diffMs = new Date(date).getTime() - Date.now();
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return format.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return format.format(hours, "hour");
  return format.format(Math.round(hours / 24), "day");
}
