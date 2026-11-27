# UAPA — Plataforma curricular

Aplicación web construida con **Next.js 16** (App Router) + **Supabase** (auth, base de datos y RLS).

## Desarrollo local

```bash
pnpm install
cp .env.example .env.local   # rellena con las credenciales de tu proyecto Supabase
pnpm dev
```

Las migraciones de Supabase viven en `supabase/migrations/`. Aplícalas en tu proyecto con la CLI de Supabase (`supabase db push`) o desde el panel antes de ejecutar la app.

## Despliegue en Vercel

La app no requiere configuración especial: Vercel detecta Next.js automáticamente y construye con `pnpm build`.

1. **Importa el repositorio** en Vercel (New Project → importar desde GitHub).
2. **Framework Preset**: Next.js (autodetectado).
   - Build Command: `pnpm build`
   - Install Command: `pnpm install --frozen-lockfile`
3. **Añade las variables de entorno** en Vercel (Settings → Environment Variables):

   | Variable | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase (`https://<project>.supabase.co`) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon/publishable) de Supabase |
   | `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | (opcional) solo para el proxy de auth de v0 en desarrollo |

4. **Configura las URLs de redirección en Supabase** (Authentication → URL Configuration → Redirect URLs). Añade:
   - `https://<tu-dominio-vercel>.vercel.app/auth/callback`
   - los dominios de preview de Vercel si los usas (p. ej. `https://*-*.vercel.app/auth/callback`)

   > El callback (`app/auth/callback/route.ts`) usa el origen de la propia petición, así que no hay URLs codificadas: solo necesitas permitir el dominio de producción en Supabase.

5. **Despliega.** Cada `push` a la rama principal publicará automáticamente.

## Notas

- El middleware de sesión vive en `proxy.ts` (Next.js 16).
- Las cookies de sesión usan `secure` en producción (`NODE_ENV === 'production'`), lo que es correcto en Vercel (HTTPS).
- `@vercel/analytics` ya está incluido, por lo que las métricas de visita funcionarán sin configuración extra.
