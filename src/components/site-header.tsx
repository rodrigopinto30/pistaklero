import { getTranslations } from "next-intl/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CommandPalette, type PaletteLink } from "@/components/command-palette";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { Link } from "@/i18n/navigation";

export async function SiteHeader() {
  const t = await getTranslations("Layout");
  const tAuth = await getTranslations("Auth");
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  const tPalette = await getTranslations("CommandPalette");

  // Accesos de la búsqueda rápida, según el rol.
  const paletteLinks: PaletteLink[] = [{ href: "/", label: tPalette("home") }];
  if (profile?.role === "candidate") {
    paletteLinks.push({ href: "/my-applications", label: t("myApplications") }, { href: "/profile", label: t("myProfile") });
  } else if (profile?.role === "recruiter") {
    paletteLinks.push(
      { href: "/dashboard", label: t("dashboard") },
      { href: "/dashboard/jobs/new", label: tPalette("newJob") },
      { href: "/dashboard/team", label: tPalette("team") }
    );
  } else if (profile?.role === "admin") {
    paletteLinks.push({ href: "/admin", label: t("admin") }, { href: "/admin/import", label: tPalette("import") });
  }
  if (profile) paletteLinks.push({ href: "/settings", label: t("settings") });
  if (!user) paletteLinks.push({ href: "/sign-in", label: tAuth("signIn") });

  return (
    <header className="border-b border-border">
      {profile?.suspended_at && (
        <p role="alert" className="bg-destructive/20 px-4 py-2 text-center text-sm text-destructive">
          {t("suspended")}
        </p>
      )}
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-2">
        <Link
          href="/"
          aria-label={t("homeLink")}
          className="rounded-md text-lg font-semibold tracking-tight"
        >
          Pista<span className="text-primary">klero</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-x-1 gap-y-2">
          {user && !profile && (
            <Link href="/welcome" className={buttonVariants()}>
              {tAuth("completeSignUp")}
            </Link>
          )}
          {profile?.role === "candidate" && (
            <>
              <Link href="/my-applications" className={buttonVariants({ variant: "ghost" })}>
                {t("myApplications")}
              </Link>
              <Link href="/profile" className={buttonVariants({ variant: "ghost" })}>
                {t("myProfile")}
              </Link>
            </>
          )}
          {profile?.role === "admin" && (
            <Link href="/admin" className={buttonVariants({ variant: "ghost" })}>
              {t("admin")}
            </Link>
          )}
          {profile?.role === "recruiter" && (
            <Link href="/dashboard" className={buttonVariants({ variant: "ghost" })}>
              {t("dashboard")}
            </Link>
          )}
          {profile && (
            <Link href="/settings" className={buttonVariants({ variant: "ghost" })}>
              {t("settings")}
            </Link>
          )}
          {user ? (
            <SignOutButton />
          ) : (
            <Link href="/sign-in" className={buttonVariants({ variant: "ghost" })}>
              {tAuth("signIn")}
            </Link>
          )}
          <CommandPalette links={paletteLinks} />
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
