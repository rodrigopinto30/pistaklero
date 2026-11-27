import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { getEnabledOAuthProviders, OAUTH_PROVIDER_NAMES, type OAuthProvider } from "@/lib/auth/providers";

// Logos oficiales (Google exige su "G" de colores en el botón; GitHub, su marca en un color).
function ProviderLogo({ provider }: { provider: OAuthProvider }) {
  if (provider === "google") {
    return (
      <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-current">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.6.2 2.9.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  );
}

/**
 * "Continuar con Google" (y GitHub): arriba de todo, porque es lo más rápido. Solo aparecen los
 * proveedores con credenciales configuradas (AUTH_OAUTH_PROVIDERS). Google va primero.
 */
export async function OAuthButtons({ next, namespace }: { next: string; namespace: "Auth" | "SignUp" }) {
  const t = await getTranslations(namespace);
  const providers = getEnabledOAuthProviders();
  if (providers.length === 0) return null;

  return (
    <>
      <ul className="flex flex-col gap-2">
        {providers.map((provider) => (
          <li key={provider}>
            <a
              href={`/api/auth/oauth/${provider}?${new URLSearchParams({ next })}`}
              className={buttonVariants({ variant: "outline", size: "lg", className: "w-full gap-3 bg-card" })}
            >
              <ProviderLogo provider={provider} />
              {t("continueWith", { provider: OAUTH_PROVIDER_NAMES[provider] })}
            </a>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-3 text-sm text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        {t("or")}
      </p>
    </>
  );
}
