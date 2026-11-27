// Corre la tarea diaria en local (anti-ghosting + envío de emails). Uso: ./run.sh pnpm cron
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)])
);
const response = await fetch(`${env.NEXT_PUBLIC_SITE_URL}/api/internal/cron`, {
  headers: { Authorization: `Bearer ${env.OUTBOX_SECRET}` },
});
console.log(response.status, JSON.stringify(await response.json(), null, 2));
