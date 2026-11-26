import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  createNonce,
  getStaticSecurityHeaders,
} from "./headers";

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split("; ").map((directive) => {
      const [name = "", ...values] = directive.split(" ");
      return [name, values];
    })
  );
}

describe("createNonce", () => {
  it("genera 128 bits en base64", () => {
    const nonce = createNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });

  it("no repite valores", () => {
    const nonces = new Set(Array.from({ length: 100 }, createNonce));
    expect(nonces.size).toBe(100);
  });
});

describe("buildContentSecurityPolicy", () => {
  const prod = directives(buildContentSecurityPolicy({ nonce: "abc", isDev: false }));
  const dev = directives(buildContentSecurityPolicy({ nonce: "abc", isDev: true }));

  it("solo permite scripts con el nonce, sin 'unsafe-inline'", () => {
    const scriptSrc = prod.get("script-src");
    expect(scriptSrc).toContain("'nonce-abc'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("permite eval solo en desarrollo", () => {
    expect(dev.get("script-src")).toContain("'unsafe-eval'");
  });

  it("bloquea plugins, <base>, embebidos en otros sitios y formularios externos", () => {
    expect(prod.get("object-src")).toEqual(["'none'"]);
    expect(prod.get("base-uri")).toEqual(["'none'"]);
    expect(prod.get("frame-ancestors")).toEqual(["'none'"]);
    expect(prod.get("form-action")).toEqual(["'self'"]);
  });

  it("fuerza HTTPS solo en producción", () => {
    expect(prod.has("upgrade-insecure-requests")).toBe(true);
    expect(dev.has("upgrade-insecure-requests")).toBe(false);
  });

  it("agrega orígenes extra de conexión e imágenes", () => {
    const policy = directives(
      buildContentSecurityPolicy({
        nonce: "abc",
        isDev: false,
        connectSrc: ["https://x.supabase.co"],
        imgSrc: ["https://avatars.githubusercontent.com"],
      })
    );
    expect(policy.get("connect-src")).toContain("https://x.supabase.co");
    expect(policy.get("img-src")).toContain("https://avatars.githubusercontent.com");
  });
});

describe("getStaticSecurityHeaders", () => {
  const keys = (isProduction: boolean) =>
    getStaticSecurityHeaders({ isProduction }).map((header) => header.key);

  it("incluye las cabeceras base en todos los entornos", () => {
    for (const isProduction of [true, false]) {
      expect(keys(isProduction)).toEqual(
        expect.arrayContaining([
          "X-Content-Type-Options",
          "Referrer-Policy",
          "Permissions-Policy",
          "Cross-Origin-Opener-Policy",
          "X-Frame-Options",
        ])
      );
    }
  });

  it("envía HSTS solo en producción", () => {
    expect(keys(true)).toContain("Strict-Transport-Security");
    expect(keys(false)).not.toContain("Strict-Transport-Security");
  });
});
