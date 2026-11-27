import { getTranslations } from "next-intl/server";
import { Avatar } from "@/components/avatar";
import { timeAgo } from "@/lib/jobs/time";
import type { Database } from "@/lib/supabase/database.types";
import { getPathname, Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { PostActions } from "./post-actions";
import { PostTags } from "./post-tags";

export type PostCardData = Database["public"]["Functions"]["post_cards"]["Returns"][number];

/** Quién escribió: el nombre y, abajo, su empresa (reclutadores) o "Candidata/o". */
export async function authorSubtitle(post: Pick<PostCardData, "author_role" | "author_company_name">) {
  const t = await getTranslations("Posts");
  if (post.author_role === "recruiter" && post.author_company_name) return t("recruiterAt", { company: post.author_company_name });
  return post.author_role === "admin" ? t("team") : t("candidate");
}

/**
 * Tarjeta de una publicación para la grilla intercalada: foto y nombre arriba (chiquito),
 * el título en negrita y un resumen. Toda la tarjeta lleva a la publicación; like y guardar van aparte.
 */
export async function PostCard({ post, locale, signedIn }: { post: PostCardData; locale: string; signedIn: boolean }) {
  const href = { pathname: "/posts/[slug]" as const, params: { slug: post.slug } };
  const tTags = await getTranslations("Posts.tags");
  // Sin sesión, "me gusta" y "guardar" quedan pendientes y se vuelve al listado (con JavaScript, a la página exacta).
  const guestReturnTo = signedIn ? undefined : getPathname({ locale: locale as AppLocale, href: "/posts" });

  return (
    <article aria-labelledby={`post-${post.id}`} className="relative flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-soft transition-shadow hover:shadow-soft-lg">
      <div className="flex items-center gap-2.5">
        <Avatar path={post.author_avatar} name={post.author_name} size="sm" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{post.author_name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {await authorSubtitle(post)} · <time dateTime={post.created_at}>{timeAgo(post.created_at, locale)}</time>
          </span>
        </div>
      </div>
      <h3 id={`post-${post.id}`} lang={post.language} className="text-lg leading-snug font-bold">
        {/* El enlace cubre toda la tarjeta con ::after, pero su nombre accesible es solo el título. */}
        <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl">
          {post.title}
        </Link>
      </h3>
      <p lang={post.language} className="text-sm leading-relaxed text-muted-foreground">
        {post.excerpt}
        {post.excerpt.length >= 280 && "…"}
      </p>
      <PostTags tags={post.tags ?? []} label={tTags("label")} />
      <PostActions postId={post.id} title={post.title} liked={post.liked} saved={post.saved} likes={post.likes_count} guestReturnTo={guestReturnTo} />
    </article>
  );
}
