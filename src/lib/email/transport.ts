import "server-only";

export type OutgoingEmail = { to: string; subject: string; html: string; text: string };

const DEFAULT_FROM = "Pistaklero <no-reply@pistaklero.local>";
const TIMEOUT_MS = 10_000;

/** "Pistaklero <hola@pistaklero.com>" → { name, email }. */
function parseFrom(from: string) {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match ? { name: match[1] ?? "", email: match[2] ?? "" } : { name: "", email: from.trim() };
}

/**
 * Envía un email. En producción por la API de Resend (RESEND_API_KEY); en desarrollo, a Mailpit.
 * Usa fetch con timeout en lugar de SDKs: menos dependencias (OWASP A03).
 */
export async function deliver(email: OutgoingEmail): Promise<void> {
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Resend respondió ${response.status}`);
    return;
  }

  if (process.env.MAILPIT_URL && process.env.NODE_ENV !== "production") {
    const sender = parseFrom(from);
    const response = await fetch(`${process.env.MAILPIT_URL}/api/v1/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        From: { Email: sender.email, Name: sender.name },
        To: [{ Email: email.to }],
        Subject: email.subject,
        HTML: email.html,
        Text: email.text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Mailpit respondió ${response.status}`);
    return;
  }

  throw new Error("No hay transporte de email configurado: falta RESEND_API_KEY");
}
