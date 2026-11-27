import { button, layout, paragraph } from "./html";

/*
 * Plantillas de email. Cada una recibe datos tipados y devuelve asunto, HTML y texto plano,
 * en el idioma de quien lo recibe. Los textos de usuarios se escapan en html.ts.
 */
type Locale = "es" | "en";
export type RenderedEmail = { subject: string; html: string; text: string };

export type EmailTemplates = {
  team_invitation: { companyName: string; inviterName: string; acceptUrl: string };
};
export type EmailTemplate = keyof EmailTemplates;

const renderers: { [K in EmailTemplate]: (locale: Locale, data: EmailTemplates[K]) => RenderedEmail } = {
  team_invitation(locale, { companyName, inviterName, acceptUrl }) {
    const copy =
      locale === "en"
        ? {
            subject: `Join ${companyName} on Pistaklero`,
            intro: `${inviterName} invited you to manage ${companyName}'s jobs on Pistaklero.`,
            cta: "Accept the invitation",
            note: "The invitation expires in 7 days. If you weren't expecting it, ignore this email.",
          }
        : {
            subject: `Sumate a ${companyName} en Pistaklero`,
            intro: `${inviterName} te invitó a gestionar las ofertas de ${companyName} en Pistaklero.`,
            cta: "Aceptar la invitación",
            note: "La invitación vence en 7 días. Si no la esperabas, ignorá este email.",
          };
    return {
      subject: copy.subject,
      html: layout({ lang: locale, title: copy.subject, body: [paragraph(copy.intro), button(acceptUrl, copy.cta), paragraph(copy.note, true)].join("") }),
      text: `${copy.intro}\n\n${copy.cta}: ${acceptUrl}\n\n${copy.note}`,
    };
  },
};

export function isEmailTemplate(value: string): value is EmailTemplate {
  return value in renderers;
}

export function renderEmail<K extends EmailTemplate>(template: K, locale: Locale, data: EmailTemplates[K]): RenderedEmail {
  const email = renderers[template](locale, data);
  // Sin saltos de línea en el asunto: evita inyectar cabeceras con un nombre de empresa malicioso.
  return { ...email, subject: email.subject.replace(/[\r\n]+/g, " ").slice(0, 200) };
}
