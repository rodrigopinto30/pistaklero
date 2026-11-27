import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HardNavigate } from "@/components/auth/hard-navigate";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { buttonVariants } from "@/components/ui/button";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import { Link } from "@/i18n/navigation";

const ERRORS = ["invalid_invitation", "email_mismatch", "already_onboarded"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Invitation");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function InvitationPage({ searchParams }: PageProps<"/[locale]/invitation">) {
  const t = await getTranslations("Invitation");
  const { error, continue: accept } = await searchParams;

  // Recién ingresó o creó la cuenta desde una invitación: se acepta (ruta /api) con navegación completa.
  if (typeof accept === "string" && accept.startsWith("/api/team/accept?") && safeNextPath(accept, "") === accept) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t("accepting")}</h1>
        <HardNavigate to={accept} />
      </div>
    );
  }

  const code = ERRORS.find((known) => known === error) ?? "invalid_invitation";
  const user = await getCurrentUser();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p role="alert" className="text-muted-foreground">
        {t(`errors.${code}`, { email: user?.email ?? "" })}
      </p>
      {code === "email_mismatch" && user ? <SignOutButton /> : (
        <Link href="/" className={buttonVariants({ variant: "outline", className: "self-start" })}>
          {t("backHome")}
        </Link>
      )}
    </div>
  );
}
