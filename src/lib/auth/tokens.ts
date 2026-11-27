import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** Token aleatorio de 256 bits para links de un solo uso, y su hash para guardar en la base. */
export function createOneTimeToken() {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash };
}
