# Pistaklero

Bolsa de empleo con perfil-portfolio, postulación en 1 clic y sistema anti-ghosting.

## Requisitos

Solo **Docker** (con Compose v2) en Linux, con tu usuario en el grupo `docker`.
Node, pnpm y la CLI de Supabase corren dentro de contenedores: no se instala nada en tu sistema.

## Uso

| Comando | Qué hace |
|---|---|
| `./start.sh` | Levanta todo: Supabase local y la app |
| `./stop.sh` | Baja todo. Los datos de la base local se conservan |
| `./run.sh <comando>` | Corre un comando dentro del contenedor de herramientas |
| `./logs.sh` | Muestra los logs de la app en vivo |
| `./check.sh [--fast]` | Todas las verificaciones (tipos, lint, tests, base, build y e2e); corta en el primer fallo |
| `./e2e.sh [archivo]` | Tests de punta a punta y de accesibilidad (Playwright + axe), con la app levantada |

Con todo arriba:

| Servicio | URL |
|---|---|
| App | http://127.0.0.1:3000 |
| Supabase API | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| Emails de prueba (Mailpit) | http://127.0.0.1:54324 |

### Ejemplos de `./run.sh`

```bash
./run.sh pnpm add zod                                   # agregar una dependencia
./run.sh pnpm lint                                      # lint
./run.sh pnpm typecheck                                 # chequeo de tipos
./run.sh pnpm test                                      # tests unitarios (Vitest)
./run.sh pnpm build                                     # build de producción
./run.sh pnpm exec supabase migration new crear_tabla   # nueva migración
./run.sh pnpm db:reset                                  # recrear la base local con las migraciones
./run.sh pnpm db:test                                   # tests de la base (pgTAP)
./run.sh pnpm db:types                                  # regenerar los tipos de TypeScript
```


## Variables de entorno

`./start.sh` escribe en `.env.local` las variables de Supabase local, dentro de un bloque marcado.
Tus propias claves (Resend, Anthropic, OAuth…) agregalas en el mismo archivo **fuera de ese bloque**: se conservan entre arranques.
La lista completa está en `.env.example`.

Después de cambiar el esquema de la base: `./run.sh pnpm db:types` regenera los tipos de TypeScript.

## Login con Google o GitHub (opcional)

En local alcanza con el link mágico: los emails llegan a Mailpit (http://127.0.0.1:54324).
Para probar OAuth:

1. Creá la app OAuth en Google Cloud o en GitHub con la URL de callback `http://127.0.0.1:54321/auth/v1/callback`.
2. Poné las credenciales en `supabase/.env` (no se versiona):
   ```
   SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=...
   SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=...
   ```
3. En `supabase/config.jsonc`, cambiá `"enabled": false` a `true` en ese proveedor.
4. En `.env.local`, fuera del bloque generado: `AUTH_OAUTH_PROVIDERS=github` (o `google,github`).
5. `./stop.sh && ./start.sh`.

## Emails

Los emails de la app pasan por una cola en la base (`email_outbox`): se encolan, se envían apenas termina la respuesta y, si fallan, se reintentan con espera creciente (hasta 5 veces).

- En desarrollo llegan a Mailpit: http://127.0.0.1:54324
- En producción se envían con Resend (`RESEND_API_KEY`, `EMAIL_FROM`).
- `POST /api/internal/outbox` con `Authorization: Bearer $OUTBOX_SECRET` vacía la cola (lo llama el cron).

## Cómo funciona

- `docker/dev.Dockerfile`: imagen con Node 24 LTS y pnpm.
- `compose.yaml`: dos servicios con la misma imagen.
  - **`web`**: corre `pnpm dev`.
  - **`tools`**: corre comandos sueltos. Es el único con acceso al socket de Docker, porque la CLI de Supabase levanta sus propios contenedores.
- Los contenedores usan la red del host, así que la app y Supabase se ven en `127.0.0.1` tanto desde el navegador como desde el servidor.
- La app escucha solo en `127.0.0.1`. Supabase local, en cambio, publica sus puertos en todas las interfaces (la CLI no permite cambiarlo): usa claves de desarrollo conocidas, así que no lo dejes corriendo en redes públicas.
- Corren con tu usuario. `node_modules` y los archivos generados quedan en la carpeta del proyecto y son tuyos, no de root.
