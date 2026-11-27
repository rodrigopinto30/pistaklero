import { getLocale, getTranslations } from "next-intl/server";
import { CommandPalette, type PaletteLink } from "@/components/command-palette";
import { SearchBar } from "@/components/header/search-bar";
import { SectionTabs } from "@/components/header/section-tabs";
import { type MenuEntry, UserMenu } from "@/components/header/user-menu";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentPerson, getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { countryOptions } from "@/lib/geo";
import { avatarUrl } from "@/lib/storage";
import { DARK_MODE_ENABLED } from "@/lib/theme/theme";
import { Link } from "@/i18n/navigation";

/**
 * Encabezado, al estilo de Airbnb: el logo, las tres secciones al centro y la cuenta a la derecha;
 * abajo, el buscador (siempre visible) con sus filtros. Queda fijo arriba al hacer scroll.
 */
export async function SiteHeader() {
  const locale = await getLocale();
  const t = await getTranslations("Layout");
  const tAuth = await getTranslations("Auth");
  const tPalette = await getTranslations("CommandPalette");
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  const person = user ? await getCurrentPerson() : null;

  // Accesos de la cuenta (menú) según el rol. La búsqueda rápida (Ctrl+K) suma las secciones.
  const entries: MenuEntry[] = [];
  if (profile?.role === "candidate") {
    entries.push(
      { href: "/profile", label: t("myProfile"), icon: "profile" },
      { href: "/my-applications", label: t("myApplications"), icon: "applications" }
    );
  } else if (profile?.role === "recruiter") {
    entries.push(
      { href: "/dashboard", label: t("dashboard"), icon: "dashboard" },
      { href: "/dashboard/company", label: t("myCompany"), icon: "company" },
      { href: "/dashboard/team", label: tPalette("team"), icon: "team" }
    );
  } else if (profile?.role === "admin") {
    entries.push({ href: "/admin", label: t("admin"), icon: "admin" }, { href: "/admin/import", label: tPalette("import"), icon: "import" });
  }
  if (profile) {
    entries.push(
      { href: "/saved", label: t("saved"), icon: "saved" },
      { href: "/my-posts", label: t("myPosts"), icon: "posts" },
      { href: "/settings", label: t("settings"), icon: "settings" }
    );
  }

  const paletteLinks: PaletteLink[] = [
    { href: "/", label: tPalette("home") },
    { href: "/companies", label: t("companies") },
    { href: "/posts", label: t("posts") },
    ...entries.map(({ href, label }) => ({ href, label })),
    ...(profile?.role === "recruiter" ? [{ href: "/dashboard/jobs/new" as const, label: tPalette("newJob") }] : []),
  ];
  if (!user) paletteLinks.push({ href: "/sign-in", label: tAuth("signIn") }, { href: "/sign-up", label: tAuth("createAccount") });

  return (
    <header className="sticky top-0 z-40 bg-background/95 shadow-header backdrop-blur-md supports-[backdrop-filter]:bg-background/85">
      {profile?.suspended_at && (
        <p role="alert" className="bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          {t("suspended")}
        </p>
      )}
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="flex min-h-16 items-center gap-3">
          <Link href="/" aria-label={t("homeLink")} className="rounded-md text-xl font-semibold tracking-tight">
            Pista<span className="text-primary">klero</span>
          </Link>
          <SectionTabs className="mx-auto hidden md:block" />
          <div className="ml-auto flex items-center gap-2">
            {user && !profile && (
              <Link href="/welcome" className={buttonVariants({ className: "rounded-full" })}>
                {tAuth("completeSignUp")}
              </Link>
            )}
            {user ? (
              <UserMenu
                name={person?.full_name ?? ""}
                email={user.email ?? ""}
                photo={avatarUrl(person?.avatar_path)}
                entries={entries}
              />
            ) : (
              <>
                <LocaleSwitcher />
                <Link href="/sign-in" className={buttonVariants({ variant: "ghost", className: "rounded-full" })}>
                  {tAuth("signIn")}
                </Link>
                <Link href="/sign-up" className={buttonVariants({ className: "hidden rounded-full sm:inline-flex" })}>
                  {tAuth("createAccount")}
                </Link>
              </>
            )}
            {DARK_MODE_ENABLED && <ThemeToggle />}
          </div>
        </div>
        {/* Sin Suspense a propósito: el buscador tiene que llegar en el HTML inicial (funciona sin JavaScript). */}
        <SearchBar countries={countryOptions(locale)} />
        <SectionTabs className="-mx-4 overflow-x-auto px-4 pb-2 md:hidden" />
      </div>
      <CommandPalette links={paletteLinks} />
    </header>
  );
}
