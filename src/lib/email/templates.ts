import { button, layout, paragraph } from "./html";

/*
 * Plantillas de email. Cada una recibe datos tipados y devuelve asunto, HTML y texto plano,
 * en el idioma de quien lo recibe. Los textos de usuarios se escapan en html.ts.
 */
type Locale = "es" | "en";
export type RenderedEmail = { subject: string; html: string; text: string };

type ApplicationStatus = "in_review" | "interview" | "hired" | "rejected" | "no_response";

export type EmailTemplates = {
  team_invitation: { companyName: string; inviterName: string; acceptUrl: string };
  application_status: { jobTitle: string; companyName: string; status: ApplicationStatus; message?: string | null };
  application_slow: { jobTitle: string; companyName: string };
  recruiter_reminder: { companyName: string; pending: number };
};

const STATUS_COPY: Record<Locale, Record<ApplicationStatus, string>> = {
  es: {
    in_review: "{company} está revisando tu postulación a {job}.",
    interview: "¡Buenas noticias! {company} quiere entrevistarte para {job}. Te van a contactar con los detalles.",
    hired: "¡Felicitaciones! {company} te eligió para {job}.",
    rejected: "{company} cerró tu postulación a {job}: esta vez avanzan con otros perfiles.",
    no_response: "{company} no respondió tu postulación a {job} en 30 días, así que la cerramos para que no quedes esperando.",
  },
  en: {
    in_review: "{company} is reviewing your application to {job}.",
    interview: "Good news! {company} wants to interview you for {job}. They'll contact you with the details.",
    hired: "Congratulations! {company} chose you for {job}.",
    rejected: "{company} closed your application to {job}: this time they're moving forward with other profiles.",
    no_response: "{company} didn't reply to your application to {job} in 30 days, so we closed it so you're not left waiting.",
  },
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
  application_slow(locale, { jobTitle, companyName }) {
    const copy =
      locale === "en"
        ? {
            subject: `${companyName} is taking longer than usual`,
            intro: `It's been 14 days without news about your application to ${jobTitle}. ${companyName} is taking longer than usual: don't put your search on hold. If they don't reply within 30 days, we'll close the application so you're not left waiting.`,
            cta: "View my applications",
          }
        : {
            subject: `${companyName} está demorando más de lo habitual`,
            intro: `Pasaron 14 días sin novedades de tu postulación a ${jobTitle}. ${companyName} está demorando más de lo habitual: no frenes tu búsqueda. Si no responden en 30 días, cerramos la postulación para que no te quedes esperando.`,
            cta: "Ver mis postulaciones",
          };
    const url = applicationsUrl(locale);
    return {
      subject: copy.subject,
      html: layout({ lang: locale, title: copy.subject, body: paragraph(copy.intro) + button(url, copy.cta) }),
      text: `${copy.intro}\n\n${copy.cta}: ${url}`,
    };
  },
  recruiter_reminder(locale, { companyName, pending }) {
    const copy =
      locale === "en"
        ? {
            subject: `${pending} application(s) waiting for ${companyName}`,
            intro: `${pending} application(s) have been waiting for a reply for more than 7 days. People are counting on you: review them or close them with a message. On Pistaklero, how fast you reply is public.`,
            cta: "Review applications",
          }
        : {
            subject: `${pending} postulación(es) esperando a ${companyName}`,
            intro: `Hay ${pending} postulación(es) esperando respuesta hace más de 7 días. Del otro lado hay personas esperando: revisalas o cerralas con un mensaje. En Pistaklero, la velocidad de respuesta es pública.`,
            cta: "Revisar postulaciones",
          };
    const url = dashboardUrl(locale);
    return {
      subject: copy.subject,
      html: layout({ lang: locale, title: copy.subject, body: paragraph(copy.intro) + button(url, copy.cta) }),
      text: `${copy.intro}\n\n${copy.cta}: ${url}`,
    };
  },
  application_status(locale, { jobTitle, companyName, status, message }) {
    const intro = STATUS_COPY[locale][status].replace("{company}", companyName).replace("{job}", jobTitle);
    const subject = locale === "en" ? `Update on your application: ${jobTitle}` : `Novedades de tu postulación: ${jobTitle}`;
    const cta = locale === "en" ? "View my applications" : "Ver mis postulaciones";
    const messageLabel = locale === "en" ? `Message from ${companyName}:` : `Mensaje de ${companyName}:`;
    const url = applicationsUrl(locale);
    const body = [paragraph(intro), message ? paragraph(messageLabel, true) + paragraph(message) : "", button(url, cta)].join("");
    return {
      subject,
      html: layout({ lang: locale, title: subject, body }),
      text: [intro, message ? `${messageLabel}\n${message}` : "", `${cta}: ${url}`].filter(Boolean).join("\n\n"),
    };
  },
};

export function dashboardUrl(locale: Locale) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  return `${base}/${locale}/${locale === "en" ? "dashboard" : "panel"}`;
}

export function applicationsUrl(locale: Locale) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000";
  return `${base}/${locale}/${locale === "en" ? "my-applications" : "mis-postulaciones"}`;
}

export function isEmailTemplate(value: string): value is EmailTemplate {
  return value in renderers;
}

export function renderEmail<K extends EmailTemplate>(template: K, locale: Locale, data: EmailTemplates[K]): RenderedEmail {
  const email = renderers[template](locale, data);
  // Sin saltos de línea en el asunto: evita inyectar cabeceras con un nombre de empresa malicioso.
  return { ...email, subject: email.subject.replace(/[\r\n]+/g, " ").slice(0, 200) };
}
