import { NextRequest } from "next/server";
import { expect, it } from "vitest";
import { isSameOrigin } from "./same-origin";

const request = (headers: Record<string, string>) => new NextRequest("https://pistaklero.test/api/x", { method: "POST", headers });

it("acepta solo pedidos de páginas del propio sitio (CSRF)", () => {
  expect(isSameOrigin(request({ "sec-fetch-site": "same-origin" }))).toBe(true);
  expect(isSameOrigin(request({ "sec-fetch-site": "cross-site" }))).toBe(false);
  expect(isSameOrigin(request({ "sec-fetch-site": "same-site" }))).toBe(false);
  // Sin Sec-Fetch-Site (navegadores viejos): decide el Origin.
  expect(isSameOrigin(request({ origin: "https://pistaklero.test" }))).toBe(true);
  expect(isSameOrigin(request({ origin: "https://evil.test" }))).toBe(false);
  expect(isSameOrigin(request({}))).toBe(false);
});
