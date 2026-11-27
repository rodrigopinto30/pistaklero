import { describe, expect, it } from "vitest";
import { isPublicAddress } from "./ip";

describe("isPublicAddress", () => {
  it.each(["8.8.8.8", "1.1.1.1", "151.101.1.69", "2606:4700:4700::1111", "2a00:1450:4001:80b::200e"])("%s es pública", (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });

  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "198.18.0.1",
    "::",
    "::1",
    "fe80::1",
    "fd00::1",
    "ff02::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "64:ff9b::a9fe:a9fe",
    "2001:db8::1",
    "no-es-una-ip",
  ])("%s está bloqueada", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it("deja pasar una IPv4 pública mapeada en IPv6", () => {
    expect(isPublicAddress("::ffff:8.8.8.8")).toBe(true);
  });
});
