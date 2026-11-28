import { EyeOff, PenLine } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPathname, Link, redirect } from "@/i18n/navigation";
import { Emoji } from "@/components/emoji";
import { BackLink } from "@/components/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Posts.mine");
  return { title: t("title"), robots: { index: false } };
}

export default async function MyPostsPage() {
  const locale = await getLocale();
  const user = await getCurrentUser();
  if (!user) redirect({ href: { pathname: "/sign-in", query: { next: getPathname({ locale, href: "/my-posts" }) } }, locale });
  if (!(await getCurrentProfile())) redirect({ href: "/welcome", locale });

  const t = await getTranslations("Posts.mine");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, slug, title, status, likes_count, created_at")
    .eq("author_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <BackLink fallback="/" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")} <Emoji symbol="📝" /></h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href="/posts/new" className={buttonVariants({ className: "rounded-full" })}>
          <PenLine aria-hidden="true" />
          {t("write")}
        </Link>
      </div>
      {(posts ?? []).length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-muted-foreground shadow-soft">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts!.map((post) => (
            <li key={post.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-5 shadow-soft">
              <div className="flex min-w-0 flex-col gap-1">
                <Link href={{ pathname: "/posts/[slug]", params: { slug: post.slug } }} className="font-semibold underline-offset-4 hover:underline">
                  {post.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {format.dateTime(new Date(post.created_at), { dateStyle: "medium" })} · {t("likes", { count: post.likes_count })}
                </p>
              </div>
              {post.status === "hidden" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/12 px-3 py-1 text-sm font-medium text-warn">
                  <EyeOff aria-hidden="true" className="size-4" />
                  {t("hidden")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
