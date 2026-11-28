import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/back-link";
import { Emoji } from "@/components/emoji";
import { ConversationList } from "@/components/messages/conversation-list";
import { requireProfilePage } from "@/lib/auth/guards";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Messages");
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Mensajes: la bandeja (o las solicitudes) y, en pantallas grandes, el lugar de la conversación. */
export default async function MessagesPage({ searchParams }: PageProps<"/[locale]/messages">) {
  const locale = (await getLocale()) as AppLocale;
  await requireProfilePage(locale, "/messages");
  const t = await getTranslations("Messages");
  const box = (await searchParams).caja === "solicitudes" ? "requests" : "inbox";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <BackLink fallback="/" />
      <h1 className="text-3xl font-semibold tracking-tight">
        {t("title")} <Emoji symbol="💬" />
      </h1>
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <ConversationList box={box} />
        <p className="hidden items-center justify-center rounded-2xl bg-muted/40 p-10 text-muted-foreground lg:flex">{t("pick")}</p>
      </div>
    </div>
  );
}
