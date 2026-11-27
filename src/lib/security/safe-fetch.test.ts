import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { checkUrl, safeGet } = await import("./safe-fetch");

describe("checkUrl", () => {
  it("acepta https al puerto por defecto", () => {
    expect(checkUrl("https://example.com/a?b=1").hostname).toBe("example.com");
    expect(checkUrl("https://example.com:443/").hostname).toBe("example.com");
  });

  it.each(["http://example.com", "ftp://example.com", "https://user:pass@example.com", "https://example.com:8443", "javascript:alert(1)", "no es una url"])(
    "rechaza %s",
    (url) => {
      expect(() => checkUrl(url)).toThrow("invalid_url");
    }
  );

  it.each(["https://127.0.0.1/", "https://169.254.169.254/latest/meta-data", "https://[::1]/", "https://10.0.0.5/"])("bloquea la IP interna %s", (url) => {
    expect(() => checkUrl(url)).toThrow("blocked_address");
  });
});

describe("safeGet", () => {
  it("no se conecta a un nombre que resuelve a una IP interna", async () => {
    // "localhost" resuelve a 127.0.0.1 / ::1: el lookup propio lo frena antes de conectar.
    await expect(safeGet("https://localhost/", { maxBytes: 1000, timeoutMs: 3000, accept: "text/html" })).rejects.toThrow("blocked_address");
  });
});
