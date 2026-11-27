import "server-only";

export const OAUTH_PROVIDERS = ["google", "github"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const OAUTH_PROVIDER_NAMES: Record<OAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
};

/**
 * Proveedores habilitados según AUTH_OAUTH_PROVIDERS (por ejemplo "google,github").
 * Solo se muestran los que tienen credenciales configuradas en Supabase.
 */
export function getEnabledOAuthProviders(): OAuthProvider[] {
  const configured = (process.env.AUTH_OAUTH_PROVIDERS ?? "").split(",").map((p) => p.trim());
  return OAUTH_PROVIDERS.filter((provider) => configured.includes(provider));
}

export function isEnabledOAuthProvider(value: string): value is OAuthProvider {
  return (getEnabledOAuthProviders() as string[]).includes(value);
}
