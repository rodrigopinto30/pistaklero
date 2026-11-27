import { expect, test } from "./support/fixtures";

// Se revisa el HTML que manda el servidor: los scripts que Next agrega después
// corren por 'strict-dynamic' y no llevan el atributo.
test("cada página lleva una CSP con nonce y todos sus scripts lo tienen", async ({ request }) => {
  const response = await request.get("/es");
  const csp = response.headers()["content-security-policy"] ?? "";
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  expect(nonce, "nonce en la CSP").toBeTruthy();
  expect(csp).toContain("'strict-dynamic'");
  expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);

  const html = await response.text();
  const scriptNonces = [...html.matchAll(/<script\b[^>]*>/g)].map(([tag]) => tag.match(/nonce="([^"]*)"/)?.[1]);
  expect(scriptNonces.length).toBeGreaterThan(0);
  expect(scriptNonces.every((value) => value === nonce)).toBe(true);
});

test("el nonce cambia en cada pedido", async ({ request }) => {
  const first = (await request.get("/es")).headers()["content-security-policy"];
  const second = (await request.get("/es")).headers()["content-security-policy"];
  expect(first).not.toEqual(second);
});

test("envía las cabeceras de seguridad y no anuncia el framework", async ({ request }) => {
  const headers = (await request.get("/es")).headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("una redirección hacia otro sitio termina en el sitio propio", async ({ page }) => {
  await page.goto("/api/auth/confirm?token_hash=falso&next=https://evil.example.com");
  expect(new URL(page.url()).host).toBe("127.0.0.1:3000");
});
