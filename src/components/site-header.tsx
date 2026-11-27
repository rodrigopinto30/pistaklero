import { getTranslations } from "next-intl/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { Link } from "@/i18n/navigation";

export async function SiteHeader() {
  const t = await getTranslations("Layout");
  const tAuth = await getTranslations("Auth");
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          aria-label={t("homeLink")}
          className="rounded-md text-lg font-semibold tracking-tight"
        >
          Pista<span className="text-primary">klero</span>
        </Link>
        <div className="flex items-center gap-2">
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
          {profile?.role === "recruiter" && (
            <Link href="/dashboard" className={buttonVariants({ variant: "ghost" })}>
              {t("dashboard")}
            </Link>
          )}
          {user ? (
            <SignOutButton />
          ) : (
            <Link href="/sign-in" className={buttonVariants({ variant: "ghost" })}>
              {tAuth("signIn")}
            </Link>
          )}
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
