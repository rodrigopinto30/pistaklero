import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tilde de empresa verificada: insignia verde con el check blanco, igual en todo el sitio.
 * Con `label`, el lector de pantalla lo anuncia ("Empresa verificada"); sin él es decorativo
 * (cuando el texto de al lado ya lo dice).
 */
export function VerifiedBadge({ label, className }: { label?: string; className?: string }) {
  return (
    <BadgeCheck
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={cn("size-4 shrink-0 fill-verified text-white", className)}
    />
  );
}
