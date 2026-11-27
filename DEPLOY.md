# Despliegue en Vercel

El portafolio es una app **Next.js 16 (App Router) + Supabase**. Vercel detecta Next.js
automáticamente; no necesita `vercel.json` ni Dockerfile de producción.

> El mismo proyecto de Supabase que ya usa el preview sirve para producción: contiene el
> esquema de `supabase/migrations` (pénsum, roles, RLS, bucket `portfolio-evidence`).

## 1. Importar el repositorio en Vercel

1. Ve a <https://vercel.com/new>.
2. Conecta tu cuenta de GitHub y elige `ROEDYCABRERA/portafolio-academico-uapa`.
3. Framework Preset: **Next.js** (se autodetecta).
4. Build Command y Output Directory: déjalos en automático.

## 2. Variables de entorno

En **Project → Settings → Environment Variables** añade (para Production y Preview):

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (la misma que usa el preview) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable key del mismo proyecto |

`NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` es **opcional** (solo para el proxy de redirección de v0);
no la configures para Vercel.

> Las credenciales que ya están guardadas en Base44 no viajan a Vercel: debes volver a
> introducirlas aquí.

## 3. URL de redirección de Supabase Auth

El inicio de sesión, registro y recuperación de contraseña redirigen a
`<dominio-de-vercel>/auth/callback` usando `window.location.origin`, así que solo debes
autorizar ese dominio en Supabase:

1. Supabase Dashboard → **Authentication → URL Configuration**.
2. **Site URL**: la URL de producción de Vercel (p. ej. `https://portafolio-academico-uapa.vercel.app`).
3. **Redirect URLs**: añade:
   - `https://<tu-dominio>/auth/callback`
   - `https://<tu-dominio>/auth/callback?next=/auth/update-password`
   - y los dominios `*.vercel.app` de preview si usas entornos de previsualización.

Sin este paso, el enlace del correo de confirmación/recuperación falla al volver al sitio.

## 4. Desplegar

Pulsa **Deploy**. Vercel instala dependencias con el package manager del `package.json`
(`pnpm@12.3.4`) y ejecuta `next build`. El build genera páginas estáticas (`/`, `/pensum`,
`/participantes`, `/reflexion`, `/admin`, `/auth/update-password`) y dinámicas
(`/asignatura/[courseId]`, `/trimestre/[trimester]`, `/auth/callback`).

Cada push a la rama principal despliega automáticamente a producción.

## Verificar

- Abre la URL de producción: la home carga el pénsum público y el directorio de participantes.
- Entra a `/admin`, inicia sesión con una cuenta confirmada y con rol `ADMINISTRADOR`/`SUPERADMIN`.
- Verifica que subir evidencia y editar contenido funcionen (usan el bucket `portfolio-evidence`
  y RLS, ya presentes en el proyecto de Supabase).
