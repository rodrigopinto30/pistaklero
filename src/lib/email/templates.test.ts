import { describe, expect, it } from "vitest";
import { escapeHtml, safeEmailUrl } from "./html";
import { renderEmail } from "./templates";

describe("emails", () => {
  it("escapa el HTML que venga de usuarios", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">`)).toBe("&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;");
  });

  it.each(["javascript:alert(1)", "data:text/html,hola", "http://evil.com", "no es url"])("no permite el enlace %s", (url) => {
    expect(safeEmailUrl(url)).toBe("#");
  });

  it("una invitación con un nombre malicioso no inyecta HTML", () => {
    const email = renderEmail("team_invitation", "es", {
      companyName: "<script>alert(1)</script>",
      inviterName: "Ana",
      acceptUrl: "https://pistaklero.com/api/team/accept?token=abc",
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain('lang="es"');
    expect(email.subject).toBe("Sumate a <script>alert(1)</script> en Pistaklero");
  });

  it("quita los saltos de línea del asunto", () => {
    const email = renderEmail("team_invitation", "es", { companyName: "Acme\r\nBcc: todos@x.com", inviterName: "Ana", acceptUrl: "https://x.com" });
    expect(email.subject).not.toMatch(/[\r\n]/);
  });

  it("el aviso de descarte incluye el mensaje escapado", () => {
    const email = renderEmail("application_status", "es", { jobTitle: "Frontend", companyName: "Acme", status: "rejected", message: "Gracias <3" });
    expect(email.subject).toBe("Novedades de tu postulación: Frontend");
    expect(email.html).toContain("Gracias &lt;3");
    expect(email.text).toContain("Mensaje de Acme:\nGracias <3");
  });

  it("el recordatorio a la empresa dice cuántas postulaciones esperan", () => {
    const email = renderEmail("recruiter_reminder", "es", { companyName: "Acme", pending: 3 });
    expect(email.subject).toBe("3 postulación(es) esperando a Acme");
    expect(email.text).toContain("/es/panel");
  });

  it("respeta el idioma de quien lo recibe", () => {
    const email = renderEmail("team_invitation", "en", { companyName: "Acme", inviterName: "Ana", acceptUrl: "https://x.com" });
    expect(email.subject).toBe("Join Acme on Pistaklero");
    expect(email.text).toContain("Accept the invitation: https://x.com");
  });
});
