import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { Avatar } from "@/components/avatar";
import { BackLink } from "@/components/back-link";
import { MessageComposer } from "@/components/messages/message-composer";
import { requireProfilePage } from "@/lib/auth/guards";
import { getCurrentProfile } from "@/lib/auth/session";
import { startConversation } from "@/lib/messages/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Messages.new");
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Escribirle a alguien: si ya tienen una conversación va a ella; si no, el primer mensaje. */
export default async function NewMessagePage({ searchParams }: PageProps<"/[locale]/messages/new">) {
  const locale = (await getLocale()) as AppLocale;
  const to = z.uuid().safeParse((await searchParams).to).data;
  await requireProfilePage(locale, { pathname: "/messages/new", query: to ? { to } : {} });
  const t = await getTranslations("Messages");
  if (!to) redirect({ href: "/messages", locale });

  const supabase = await createClient();
  const { data: existing } = await supabase.rpc("conversation_with", { p_user_id: to! });
  if (existing) redirect({ href: { pathname: "/messages/[id]", params: { id: existing } }, locale });
  const [{ data: allowed }, { data: contacts }, profile] = await Promise.all([
    supabase.rpc("can_i_message", { p_recipient: to! }),
    supabase.rpc("message_card", { p_user_id: to! }),
    getCurrentProfile(),
  ]);
  const contact = contacts?.[0];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <BackLink fallback="/messages" />
      <h1 className="text-3xl font-semibold tracking-tight">{t("new.title")}</h1>
      {!allowed || !contact ? (
        <p role="status" className="rounded-2xl bg-muted p-4">
          {t("new.notAvailable")}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
            <span className="text-sm text-muted-foreground">{t("new.to")}</span>
            <Avatar path={contact.avatar_path} name={contact.full_name} size="md" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{contact.full_name}</span>
              {contact.subtitle && <span className="truncate text-sm text-muted-foreground">{contact.subtitle}</span>}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t("new.intro")}</p>
          <MessageComposer action={startConversation} hidden={{ to: to!, locale }} enterSends={profile?.message_enter_sends ?? true} />
        </>
      )}
    </div>
  );
}
