import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PostForm } from "@/components/posts/post-form";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentPerson, getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { getPathname, Link, redirect } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Posts.form");
  return { title: t("newTitle"), robots: { index: false } };
}

export default async function NewPostPage() {
  const locale = await getLocale();
  if (!(await getCurrentUser())) {
    redirect({ href: { pathname: "/sign-in", query: { next: getPathname({ locale, href: "/posts/new" }) } }, locale });
  }
  const profile = await getCurrentProfile();
  if (!profile) redirect({ href: "/welcome", locale });
  const t = await getTranslations("Posts.form");
  const person = await getCurrentPerson();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("newTitle")}</h1>
        <p className="text-muted-foreground">{t("newSubtitle")}</p>
      </div>
      <div className="rounded-2xl bg-card p-6 shadow-soft">
        {person ? (
          <PostForm locale={locale} />
        ) : (
          // Para publicar hace falta un nombre (se muestra con la publicación).
          <div className="flex flex-col items-start gap-3">
            <p>{t("needsName")}</p>
            <Link href={profile?.role === "candidate" ? "/profile" : "/settings"} className={buttonVariants()}>
              {t("completeName")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
