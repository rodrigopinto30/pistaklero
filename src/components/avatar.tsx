import { avatarUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

/** "Ana María Pérez" → "AP": la primera letra del nombre y la del apellido. */
export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

const SIZES = {
  xs: "size-6 text-[0.625rem]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-16 text-xl",
  xl: "size-24 text-3xl",
} as const;

/**
 * Foto de perfil redonda, o las iniciales si no hay foto.
 * Es decorativa (alt=""): el nombre siempre está escrito al lado.
 */
export function Avatar({
  path,
  name,
  size = "md",
  className,
}: {
  path: string | null | undefined;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const src = avatarUrl(path);
  const base = cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full", SIZES[size], className);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- WebP de 256 px ya optimizado, desde nuestro Storage.
    return <img src={src} alt="" width={256} height={256} className={cn(base, "bg-muted object-cover")} />;
  }
  return (
    <span aria-hidden="true" className={cn(base, "bg-secondary font-semibold text-secondary-foreground select-none")}>
      {initialsOf(name)}
    </span>
  );
}
