import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { requireRecruiterPage } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { AppLocale } from "@/i18n/routing";
import { changeMember, revokeInvitation } from "./actions";
import { InviteForm } from "./_components/invite-form";
import { Emoji } from "@/components/emoji";
import { ConfirmButton } from "@/components/confirm-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Team");
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function TeamPage() {
  const locale = (await getLocale()) as AppLocale;
  const recruiter = await requireRecruiterPage(locale, "/dashboard/team");
  const isOwner = recruiter.memberRole === "owner";
  const t = await getTranslations("Team");
  const tConfirm = await getTranslations("Confirm");
  const format = await getFormatter();

  const supabase = await createClient();
  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase.rpc("list_company_members"),
    isOwner
      ? supabase.from("company_invitations").select("id, email, expires_at").is("accepted_at", null).gt("expires_at", new Date().toISOString()).order("created_at")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")} <Emoji symbol="👥" /></h1>
        <p className="text-muted-foreground">{t("subtitle", { company: recruiter.company.name })}</p>
      </div>

      <SectionCard id="members" title={t("membersTitle")}>
        <ul className="flex flex-col gap-2">
          {(members ?? []).map((member) => (
            <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2">
              <span className="flex flex-col">
                <span className="font-medium">{member.email}</span>
                <span className="text-sm text-muted-foreground">{t(`roles.${member.member_role}`)}</span>
              </span>
              {isOwner && member.user_id !== recruiter.userId && (
                <span className="flex gap-1">
                  {member.member_role === "member" && (
                    <form action={changeMember}>
                      <input type="hidden" name="userId" value={member.user_id} />
                      <input type="hidden" name="memberAction" value="make_owner" />
                      <Button type="submit" variant="ghost" aria-label={t("makeOwnerOf", { email: member.email })}>
                        {t("makeOwner")}
                      </Button>
                    </form>
                  )}
                  <form action={changeMember}>
                    <input type="hidden" name="userId" value={member.user_id} />
                    <input type="hidden" name="memberAction" value="remove" />
                    <ConfirmButton ariaLabel={t("removeOf", { email: member.email })} title={tConfirm("removeMember.title", { email: member.email })} description={tConfirm("removeMember.description")} confirmLabel={tConfirm("remove")}>
                      {t("remove")}
                    </ConfirmButton>
                  </form>
                </span>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>

      {isOwner ? (
        <>
          <SectionCard id="invite" title={t("inviteTitle")} description={t("inviteHint")}>
            <InviteForm locale={locale} />
          </SectionCard>
          <SectionCard id="pending" title={t("pendingTitle")}>
            {(invitations ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("pendingEmpty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {invitations!.map((invitation) => (
                  <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2">
                    <span className="flex flex-col">
                      <span className="font-medium">{invitation.email}</span>
                      <span className="text-sm text-muted-foreground">
                        {t("expires", { date: format.dateTime(new Date(invitation.expires_at), { dateStyle: "medium" }) })}
                      </span>
                    </span>
                    <form action={revokeInvitation}>
                      <input type="hidden" name="invitationId" value={invitation.id} />
                      <ConfirmButton variant="ghost" ariaLabel={t("revokeOf", { email: invitation.email })} title={tConfirm("revokeInvitation.title", { email: invitation.email })} description={tConfirm("revokeInvitation.description")} confirmLabel={tConfirm("remove")}>
                        {t("revoke")}
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("onlyOwners")}</p>
      )}
    </div>
  );
}
