// Da rol de admin a una cuenta existente. Uso: ./run.sh pnpm admin:grant persona@ejemplo.com
// Usa la clave secreta de Supabase (.env.local): solo para quien administra el sistema.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Uso: pnpm admin:grant <email>");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

let user;
for (let page = 1; !user; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === email);
  if (data.users.length < 200) break;
}
if (!user) {
  console.error(`No existe una cuenta con ${email}. Ingresá primero con ese email.`);
  process.exit(1);
}

const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
if (profile && profile.role !== "admin") {
  console.error(`La cuenta ya tiene rol "${profile.role}". Por seguridad, usá una cuenta nueva para administrar.`);
  process.exit(1);
}
if (!profile) await admin.from("profiles").insert({ id: user.id, role: "admin" });
await admin.from("audit_log").insert({ actor_id: null, action: "admin.granted", target_type: "user", target_id: user.id });
console.log(`✔ ${email} ahora es admin.`);
