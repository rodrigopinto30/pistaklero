import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PostForm } from "@/components/posts/post-form";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Posts.form");
  return { title: t("editTitle"), robots: { index: false } };
}

export default async function EditPostPage({ params }: PageProps<"/[locale]/posts/[slug]/edit">) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  const supabase = await createClient();
  const { data: post } = await supabase.from("posts").select("id, title, body, language, author_id").eq("slug", slug).maybeSingle();
  // Solo quien la escribió la edita (la función de la base lo vuelve a verificar).
  if (!post || post.author_id !== user.id) notFound();

  const locale = await getLocale();
  const t = await getTranslations("Posts.form");
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">{t("editTitle")}</h1>
      <div className="rounded-2xl bg-card p-6 shadow-soft">
        <PostForm locale={locale} saved={{ id: post.id, title: post.title, body: post.body, language: post.language }} />
      </div>
    </div>
  );
}
