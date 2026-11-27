// Corre las tareas diarias en local. Uso:
//   ./run.sh pnpm cron            # anti-ghosting, resumen diario y envío de emails
//   ./run.sh pnpm cron import     # sincronización de tableros (Greenhouse, Lever, Ashby, Workable)
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)])
);
const path = process.argv[2] === "import" ? "/api/internal/import-sync" : "/api/internal/cron";
const response = await fetch(`${env.NEXT_PUBLIC_SITE_URL}${path}`, {
  headers: { Authorization: `Bearer ${env.OUTBOX_SECRET}` },
});
console.log(response.status, JSON.stringify(await response.json(), null, 2));
