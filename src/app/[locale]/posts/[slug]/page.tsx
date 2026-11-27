import { Pencil, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { cache } from "react";
import { Avatar } from "@/components/avatar";
import { Markdown } from "@/components/markdown";
import { authorSubtitle } from "@/components/posts/post-card";
import { PostActions } from "@/components/posts/post-actions";
import { ReportPostForm } from "@/components/posts/report-post-form";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { deletePost } from "@/lib/posts/actions";
import { createClient } from "@/lib/supabase/server";
import { getPathname, Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { ConfirmButton } from "@/components/confirm-button";

/** La publicación (RLS: publicada, propia o admin) y su tarjeta pública (autor, likes, guardada). */
const loadPost = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: post } = await supabase.from("posts").select("id, slug, title, body, language, status, author_id, created_at, updated_at").eq("slug", slug).maybeSingle();
  if (!post) return null;
  const { data: cards } = await supabase.rpc("post_cards", { p_post_id: post.id, p_limit: 1 });
  const card = cards?.[0] ?? null;
  return { post, card };
});

export async function generateMetadata({ params }: PageProps<"/[locale]/posts/[slug]">): Promise<Metadata> {
  const loaded = await loadPost((await params).slug);
  if (!loaded) return {};
  return { title: loaded.post.title, description: loaded.card?.excerpt.slice(0, 160), robots: { index: loaded.post.status === "published" } };
}

export default async function PostPage({ params }: PageProps<"/[locale]/posts/[slug]">) {
  const { slug } = await params;
  const loaded = await loadPost(slug);
  if (!loaded) notFound();
  const { post, card } = loaded;

  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("Posts");
  const tConfirm = await getTranslations("Confirm");
  const format = await getFormatter();
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;
  const isAuthor = user?.id === post.author_id;
  const canDelete = isAuthor || profile?.role === "admin";
  const here = getPathname({ locale, href: { pathname: "/posts/[slug]", params: { slug } } });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <Link href="/posts" className="self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        ← {t("back")}
      </Link>

      <article lang={post.language} className="flex flex-col gap-6 rounded-3xl bg-card p-6 shadow-soft sm:p-10">
        {post.status === "hidden" && (
          <p role="note" className="rounded-xl bg-warn/12 p-3 text-sm text-warn">
            {t("hiddenNote")}
          </p>
        )}
        <header className="flex flex-col gap-5">
          <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl">{post.title}</h1>
          {card && (
            <div className="flex items-center gap-3">
              <Avatar path={card.author_avatar} name={card.author_name} size="md" />
              <div className="flex flex-col">
                {card.author_profile_slug ? (
                  <Link href={{ pathname: "/p/[slug]", params: { slug: card.author_profile_slug } }} className="font-medium underline-offset-4 hover:underline">
                    {card.author_name}
                  </Link>
                ) : card.author_company_slug ? (
                  <Link href={{ pathname: "/companies/[slug]", params: { slug: card.author_company_slug } }} className="font-medium underline-offset-4 hover:underline">
                    {card.author_name}
                  </Link>
                ) : (
                  <span className="font-medium">{card.author_name}</span>
                )}
                <span className="text-sm text-muted-foreground">
                  {await authorSubtitle(card)} · <time dateTime={post.created_at}>{format.dateTime(new Date(post.created_at), { dateStyle: "medium" })}</time>
                </span>
              </div>
            </div>
          )}
        </header>

        <Markdown lang={post.language}>{post.body}</Markdown>

        {card && (
          <div className="border-t border-border pt-4">
            <PostActions
              postId={post.id}
              title={post.title}
              liked={card.liked}
              saved={card.saved}
              likes={card.likes_count}
              size="md"
              guestReturnTo={user ? undefined : here}
            />
          </div>
        )}
      </article>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {isAuthor && (
          <Link href={{ pathname: "/posts/[slug]/edit", params: { slug } }} className={buttonVariants({ variant: "secondary" })}>
            <Pencil aria-hidden="true" />
            {t("edit")}
          </Link>
        )}
        {canDelete && (
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <input type="hidden" name="locale" value={locale} />
            <ConfirmButton title={tConfirm("deletePost.title")} description={tConfirm("deletePost.description")} confirmLabel={tConfirm("delete")}>
              <Trash2 aria-hidden="true" />
              {t("delete")}
            </ConfirmButton>
          </form>
        )}
        {user && !isAuthor && post.status === "published" && <ReportPostForm postId={post.id} />}
      </div>
    </div>
  );
}
