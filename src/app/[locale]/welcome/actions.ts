"use server";

import { refresh } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { parseLocale } from "@/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { type OnboardingField, onboardingSchema } from "@/lib/validation/onboarding";

type FormValues = Partial<Record<OnboardingField, string>>;

export type OnboardingState =
  | { status: "idle" }
  | {
      status: "error";
      fieldErrors: Partial<Record<OnboardingField, true>>;
      formError?: "company_exists" | "unknown";
      values: FormValues;
    };

const FIELDS: OnboardingField[] = ["role", "fullName", "headline", "companyName", "websiteUrl"];

export async function completeOnboarding(
  _previous: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const locale = parseLocale(formData.get("locale"));
  const values: FormValues = Object.fromEntries(
    FIELDS.map((field) => [field, String(formData.get(field) ?? "")])
  );

  const parsed = onboardingSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<OnboardingField, true>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && (FIELDS as string[]).includes(field)) {
        fieldErrors[field as OnboardingField] = true;
      }
    }
    // Sin rol elegido, el error es del rol.
    if (!values.role) fieldErrors.role = true;
    return { status: "error", fieldErrors, values };
  }

  const supabase = await createClient();
  const data = parsed.data;
  const { error } =
    data.role === "candidate"
      ? await supabase.rpc("onboard_candidate", {
          p_full_name: data.fullName,
          p_headline: data.headline,
          p_locale: locale,
        })
      : await supabase.rpc("create_company", {
          p_company_name: data.companyName,
          p_website_url: data.websiteUrl ?? "",
          p_locale: locale,
        });

  if (error) {
    if (error.message === "already_onboarded") return redirect({ href: "/", locale });
    if (error.message === "company_exists") {
      return { status: "error", fieldErrors: { websiteUrl: true }, formError: "company_exists", values };
    }
    console.error("La bienvenida falló", { code: error.code, message: error.message });
    return { status: "error", fieldErrors: {}, formError: "unknown", values };
  }

  // El encabezado (en el layout) tiene que dejar de mostrar "Completá tu registro".
  refresh();
  // La candidata sigue armando su perfil; la empresa vuelve al inicio (el panel llega con las ofertas).
  return redirect({ href: data.role === "candidate" ? "/profile" : "/", locale });
}
