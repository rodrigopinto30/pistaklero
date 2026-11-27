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

/** URL pública de una foto de perfil guardada en el bucket avatars. */
export function avatarUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${getPublicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

/** URL pública de la portada de una empresa (bucket company-covers). */
export function companyCoverUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${getPublicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/company-covers/${path}`;
}
