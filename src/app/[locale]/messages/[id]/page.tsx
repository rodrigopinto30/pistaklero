import { Ban } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { Avatar } from "@/components/avatar";
import { BackLink } from "@/components/back-link";
import { ConfirmButton } from "@/components/confirm-button";
import { ConversationList } from "@/components/messages/conversation-list";
import { ConversationView } from "@/components/messages/conversation-view";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireProfilePage } from "@/lib/auth/guards";
import { answerRequest, blockUser, unblockUser } from "@/lib/messages/actions";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Messages");
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Una conversación: con quién, la solicitud (si hay), los mensajes y el cuadro para escribir. */
export default async function ConversationPage({ params }: PageProps<"/[locale]/messages/[id]">) {
  const { id } = await params;
  const locale = (await getLocale()) as AppLocale;
  await requireProfilePage(locale, { pathname: "/messages/[id]", params: { id } });
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: details }, { data: messages }] = await Promise.all([
    supabase.rpc("conversation_detail", { p_conversation_id: id }),
    supabase.rpc("conversation_messages", { p_conversation_id: id, p_limit: 100 }),
  ]);
  const conversation = details?.[0];
  if (!conversation) notFound();
  const t = await getTranslations("Messages");
  const tConfirm = await getTranslations("Confirm");
  const name = conversation.other_name;
  const box = conversation.my_state === "request" ? "requests" : "inbox";
  const iSentAlready = (messages ?? []).some((m) => m.mine);
  const waiting = conversation.their_state !== "accepted" && iSentAlready;
  const canWrite = !conversation.blocked && !waiting;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <BackLink fallback="/messages" />
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="hidden lg:block">
          <ConversationList box={box} activeId={id} />
        </div>

        <section aria-labelledby="conversation-title" className="flex min-w-0 flex-col gap-4">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-soft">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar path={conversation.other_avatar} name={name} size="md" />
              <div className="flex min-w-0 flex-col">
                <h1 id="conversation-title" className="truncate text-lg font-semibold">
                  {name}
                </h1>
                {conversation.other_subtitle && <p className="truncate text-sm text-muted-foreground">{conversation.other_subtitle}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {conversation.other_profile_slug && (
                <Link href={{ pathname: "/p/[slug]", params: { slug: conversation.other_profile_slug } }} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {t("viewProfile")}
                </Link>
              )}
              {conversation.other_company_slug && (
                <Link href={{ pathname: "/companies/[slug]", params: { slug: conversation.other_company_slug } }} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {t("viewCompany")}
                </Link>
              )}
              {conversation.blocked_by_me ? (
                <form action={unblockUser}>
                  <input type="hidden" name="userId" value={conversation.other_id} />
                  <Button type="submit" variant="outline" size="sm">
                    {t("unblock")}
                  </Button>
                </form>
              ) : (
                <form action={blockUser}>
                  <input type="hidden" name="userId" value={conversation.other_id} />
                  <input type="hidden" name="locale" value={locale} />
                  <ConfirmButton variant="ghost" size="sm" title={tConfirm("blockUser.title", { name })} description={tConfirm("blockUser.description")} confirmLabel={t("block")}>
                    <Ban aria-hidden="true" />
                    {t("block")}
                  </ConfirmButton>
                </form>
              )}
            </div>
          </header>

          {conversation.blocked ? (
            <p role="status" className="rounded-2xl bg-muted p-4 text-sm">
              {conversation.blocked_by_me ? t("blockedBanner") : t("blockedByOther")}
            </p>
          ) : conversation.my_state === "request" ? (
            <div role="status" className="flex flex-col gap-3 rounded-2xl bg-primary/10 p-4">
              <p className="text-sm">{t("requestBanner", { name })}</p>
              <div className="flex flex-wrap items-center gap-2">
                <form action={answerRequest}>
                  <input type="hidden" name="conversationId" value={id} />
                  <input type="hidden" name="accept" value="1" />
                  <input type="hidden" name="locale" value={locale} />
                  <Button type="submit" size="sm">
                    {t("accept")}
                  </Button>
                </form>
                <form action={answerRequest}>
                  <input type="hidden" name="conversationId" value={id} />
                  <input type="hidden" name="accept" value="0" />
                  <input type="hidden" name="locale" value={locale} />
                  <Button type="submit" variant="outline" size="sm">
                    {t("ignore")}
                  </Button>
                </form>
                <span className="text-xs text-muted-foreground">{t("ignoreHint")}</span>
              </div>
            </div>
          ) : (
            waiting && (
              <p role="status" className="rounded-2xl bg-muted p-4 text-sm">
                {t("waitingBanner", { name })}
              </p>
            )
          )}

          <ConversationView conversationId={id} otherName={name} initialMessages={messages ?? []} canWrite={canWrite} />
        </section>
      </div>
    </div>
  );
}
