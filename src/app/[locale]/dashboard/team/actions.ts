"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentRecruiter } from "@/lib/auth/recruiter";
import { getCurrentUser } from "@/lib/auth/session";
import { createOneTimeToken } from "@/lib/auth/tokens";
import { enqueueEmail } from "@/lib/email/outbox";
import { getPublicEnv } from "@/lib/env";
import { errorState, type FormState, formValues, successState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

const inviteSchema = z.object({ email: z.email().max(254), inviteLocale: z.enum(["es", "en"]) });

export async function inviteMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const recruiter = await getCurrentRecruiter();
  const user = await getCurrentUser();
  if (!recruiter || recruiter.memberRole !== "owner" || !user) return errorState(values, {}, "unknown");

  const parsed = inviteSchema.safeParse(values);
  if (!parsed.success) return errorState(values, { email: { code: "invalid" } });

  const { token, hash } = createOneTimeToken();
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_invitation", { p_email: parsed.data.email, p_token_hash: hash });
  if (error) {
    if (error.message === "already_member") return errorState(values, { email: { code: "invalid" } }, "duplicate");
    if (error.message === "limit_reached") return errorState(values, {}, "limit_reached");
    return errorState(values, {}, "unknown");
  }

  const acceptUrl = new URL("/api/team/accept", getPublicEnv().NEXT_PUBLIC_SITE_URL);
  acceptUrl.searchParams.set("token", token);
  acceptUrl.searchParams.set("locale", parsed.data.inviteLocale);
  await enqueueEmail({
    to: parsed.data.email,
    template: "team_invitation",
    locale: parsed.data.inviteLocale,
    data: { companyName: recruiter.company.name, inviterName: user.email ?? recruiter.company.name, acceptUrl: acceptUrl.toString() },
  });

  refresh();
  return successState();
}

export async function revokeInvitation(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("invitationId"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("company_invitations").delete().eq("id", id.data);
  refresh();
}

export async function changeMember(formData: FormData) {
  const userId = z.uuid().safeParse(formData.get("userId"));
  const action = z.enum(["remove", "make_owner"]).safeParse(formData.get("memberAction"));
  if (!userId.success || !action.success) return;
  const supabase = await createClient();
  await supabase.rpc("update_member", { p_user_id: userId.data, p_action: action.data });
  refresh();
}

