import net from "node:net";

/*
 * ¿Es una IP pública de internet? Todo lo demás (loopback, redes privadas, link-local con la metadata
 * de la nube en 169.254.169.254, multicast, rangos reservados o de documentación) se bloquea: así una URL
 * cargada por una persona no puede hacer que el servidor consulte la red interna (OWASP A01: SSRF).
 */
const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const v4ToInt = (ip: string) => ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;

function isPublicV4(ip: string) {
  const value = v4ToInt(ip);
  return !BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (value & mask) === (v4ToInt(base) & mask);
  });
}

/** Expande una IPv6 a sus 8 grupos de 16 bits. */
function v6Groups(ip: string): number[] {
  let address = ip.toLowerCase().split("%")[0]!;
  // IPv4 al final (::ffff:1.2.3.4): se pasa a dos grupos.
  const v4 = address.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const n = v4ToInt(v4[1]!);
    address = address.replace(v4[1]!, `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`);
  }
  const [head, tail] = address.split("::");
  const left = head ? head.split(":") : [];
  const right = tail !== undefined && tail !== "" ? tail.split(":") : [];
  const fill = address.includes("::") ? Array(8 - left.length - right.length).fill("0") : [];
  return [...left, ...fill, ...right].map((group) => parseInt(group || "0", 16));
}

function isPublicV6(ip: string) {
  const g = v6Groups(ip);
  if (g.length !== 8 || g.some((n) => Number.isNaN(n))) return false;
  const embeddedV4 = () => `${g[6]! >> 8}.${g[6]! & 0xff}.${g[7]! >> 8}.${g[7]! & 0xff}`;
  if (g.every((n) => n === 0)) return false; // ::
  if (g.slice(0, 7).every((n) => n === 0) && g[7] === 1) return false; // ::1
  // IPv4 mapeada (::ffff:a.b.c.d) o NAT64 (64:ff9b::a.b.c.d): manda la IPv4 de adentro.
  if (g.slice(0, 5).every((n) => n === 0) && g[5] === 0xffff) return isPublicV4(embeddedV4());
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((n) => n === 0)) return isPublicV4(embeddedV4());
  if ((g[0]! & 0xfe00) === 0xfc00) return false; // fc00::/7, direcciones locales únicas
  if ((g[0]! & 0xffc0) === 0xfe80) return false; // fe80::/10, link-local
  if ((g[0]! & 0xff00) === 0xff00) return false; // ff00::/8, multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return false; // documentación
  if (g[0] === 0x0100 && g.slice(1, 4).every((n) => n === 0)) return false; // 100::/64, descarte
  // Solo el espacio global unicast (2000::/3).
  return (g[0]! & 0xe000) === 0x2000;
}

export function isPublicAddress(ip: string) {
  const version = net.isIP(ip);
  if (version === 4) return isPublicV4(ip);
  if (version === 6) return isPublicV6(ip);
  return false;
}
