import { getPublicEnv } from "@/lib/env";

/** URL pública de la vista previa de un proyecto (bucket project-previews). */
export function projectPreviewUrl(path: string | null) {
  if (!path) return null;
  return `${getPublicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/project-previews/${path}`;
}

/** URL pública de un logo guardado en el bucket company-logos. */
export function companyLogoUrl(path: string | null) {
  if (!path) return null;
  return `${getPublicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company-logos/${path}`;
}
