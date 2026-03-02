# Grimorio D&D (Next.js) — Proyecto premium, gratis-friendly

Este repo trae una web completa en **español** con:

- Home educativa (qué es D&D, cómo se juega, FAQ)
- `/videos` videos embebidos con lista editable
- `/simulador` one-shot tutorial interactivo en español
- `/campanias` campañas + formulario guardado en **Postgres** + `/admin` para ver inscriptos

> UI/estética inspirada en tu `index.html` (oscuro + dorado + niebla/atmósfera).

---

## Requisitos

- Node 18+ (recomendado 20)
- Una DB Postgres gratis:
  - Neon Free (recomendado): {"neon.com/pricing"} citeturn0search3
  - Supabase Free: {"supabase.com/pricing"} citeturn0search2

## Instalación

```bash
npm install
cp .env.example .env.local
```

## Configurar DB (Postgres)

1. Crear proyecto en Neon o Supabase.
2. Copiar tu connection string a `DATABASE_URL` en `.env.local`.
3. Aplicar schema:

```bash
npm run db:setup
npm run db:seed
```

## Correr local

```bash
npm run dev
```

Abrí `http://localhost:3000`

## Admin (login simple)

- Seteá `ADMIN_PASSWORD` en `.env.local`
- Entrá a `/admin` → te redirige a `/admin/login`

## Nota

Este repo evita dependencias de APIs externas para las secciones principales (videos, simulador y campañas).

## Deploy 1-click

### Vercel (recomendado)

1. Subí el repo a GitHub.
2. Importalo en Vercel.
3. Variables de entorno en Vercel:
   - `DATABASE_URL`
   - `ADMIN_PASSWORD`
   - (opcional) `NEXT_PUBLIC_BASE_URL` con tu dominio

### Netlify (alternativa)

- Build command: `npm run build`
- Publish dir: `.next`
- Variables: las mismas que Vercel.

> Nota: si no configurás DB, la app sigue andando (simulador y videos). Campañas/Admin necesitan DB.

---

## Estructura

- `app/(marketing)` landing
- `app/videos`
- `app/simulador`
- `app/campanias` + `app/campanias/[slug]`
- `app/admin` + `app/admin/login`
- `app/api/*` route handlers
- `data/*` (videos, escenas del simulador)
- `db/schema.sql` migración
- `scripts/*` setup/seed

## QA básico / buenas prácticas

- Validación con Zod (form de inscripción)
- Rate limit simple (memoria del serverless instance)
- Sanitización básica por límites de longitud
- Accesibilidad: focus states, labels, navegación teclado

---

## Opcional: “modo IA” (sin romper el modo gratis)

El simulador funciona 100% por reglas/plantillas y escenas JSON.  
Si querés, podés agregar una ruta `/api/ai` que use un LLM con `OPENAI_API_KEY` y un toggle en UI. Por defecto **NO** se usa.



## Netlify (deploy)

- El repo incluye `netlify.toml` con el plugin de Next.js.
- Variables a setear en Netlify:
  - `DATABASE_URL`
  - `ADMIN_PASSWORD`
  - `NEXT_PUBLIC_SITE_URL` (opcional; si no, usa `URL` que Netlify ya provee)
