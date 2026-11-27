import { Building2 } from "lucide-react";
import { brandGradient } from "@/lib/companies/brand";
import { companyCoverUrl, companyLogoUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

/**
 * Fondo de una empresa: su portada o, si no tiene, un degradé con su tono y el logo al centro.
 * Es decorativo (el nombre siempre está escrito): alt vacío y aria-hidden.
 */
export function CompanyCover({
  name,
  coverPath,
  logoPath,
  className,
}: {
  name: string;
  coverPath: string | null;
  logoPath: string | null;
  className?: string;
}) {
  const cover = companyCoverUrl(coverPath);
  if (cover) {
    // eslint-disable-next-line @next/next/no-img-element -- WebP de 1200×800 ya optimizado, desde nuestro Storage.
    return <img src={cover} alt="" width={1200} height={800} className={cn("object-cover", className)} />;
  }
  const logo = companyLogoUrl(logoPath);
  return (
    <div aria-hidden="true" style={{ backgroundImage: brandGradient(name) }} className={cn("flex items-center justify-center", className)}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- WebP de 256 px ya optimizado, desde nuestro Storage.
        <img src={logo} alt="" width={96} height={96} className="size-20 rounded-2xl bg-white/90 object-contain p-2 shadow-soft" />
      ) : (
        <Building2 className="size-12 text-white/70" />
      )}
    </div>
  );
}
