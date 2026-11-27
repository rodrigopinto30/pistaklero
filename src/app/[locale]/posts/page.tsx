import { PenLine } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Masonry } from "@/components/masonry";
import { PostCard } from "@/components/posts/post-card";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPathname, Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { Emoji } from "@/components/emoji";
import { normalizeTag } from "@/lib/posts/tags";

const PAGE_SIZE = 24;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Posts");
  return { title: t("metaTitle"), description: t("subtitle") };
}

export default async function PostsPage({ searchParams }: PageProps<"/[locale]/posts">) {
  await connection();
  const params = await searchParams;
  const rawQuery = typeof params.q === "string" ? params.q.trim().slice(0, 200) : "";
  // "#ia" en el buscador o ?tag=ia: el listado de esa etiqueta.
  const tag = normalizeTag(typeof params.tag === "string" ? params.tag : rawQuery.startsWith("#") ? rawQuery : "");
  const q = tag ? "" : rawQuery;
  const page = Math.min(Math.max(Number(params.page) || 1, 1), 20);
  const locale = await getLocale();
  const t = await getTranslations("Posts");
  const signedIn = Boolean(await getCurrentUser());

  const supabase = await createClient();
  const { data } = await supabase.rpc("post_cards", { p_query: q || undefined, p_tag: tag ?? undefined, p_limit: PAGE_SIZE * page });
  const posts = data ?? [];
  const total = Number(posts[0]?.total_count ?? 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")} <Emoji symbol="💡" /></h1>
          <p className="text-muted-foreground">{t("subtitle")} <Emoji symbol="✍️" /></p>
        </div>
        <Link href={signedIn ? "/posts/new" : { pathname: "/sign-in", query: { next: getPathname({ locale: locale as AppLocale, href: "/posts/new" }) } }} className={buttonVariants({ className: "rounded-full" })}>
          <PenLine aria-hidden="true" />
          {signedIn ? t("write") : t("signInToWrite")}
        </Link>
      </div>

      {tag && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-8 items-center rounded-full bg-primary/10 px-3 font-medium text-primary">{t("tags.filter", { tag })}</span>
          <Link href="/posts" className="text-sm font-medium text-primary underline underline-offset-4">
            {t("tags.clear")}
          </Link>
        </div>
      )}
      <p role="status" className="text-sm text-muted-foreground">
        {q ? t("countFor", { count: total, query: q }) : t("count", { count: total })}
      </p>

      {posts.length > 0 ? (
        <Masonry label={t("title")}>
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} locale={locale} signedIn={signedIn} />
            </li>
          ))}
        </Masonry>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-card p-6 shadow-soft">
          <p>{q ? t("emptySearch") : t("empty")}</p>
          {q && (
            <Link href="/posts" className={buttonVariants({ variant: "outline" })}>
              {t("seeAll")}
            </Link>
          )}
        </div>
      )}

      {total > posts.length && page < 20 && (
        <Link
          href={{ pathname: "/posts", query: { ...(q ? { q } : {}), ...(tag ? { tag } : {}), page: String(page + 1) } }}
          scroll={false}
          className={buttonVariants({ variant: "outline", className: "self-center rounded-full" })}
        >
          {t("loadMore")}
        </Link>
      )}
    </div>
  );
}
