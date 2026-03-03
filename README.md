# Sitio D&D — Web en español

Web para comunidad rolera con:

- Home educativa (qué es D&D, cómo se juega, FAQ)
- **/videos**: videoteca con categorías (editable en `data/videos.ts`)
- **/simulador**: aventuras interactivas con voz y música (varias temáticas)
- **/campanias**: campañas + formulario + panel admin

## Configuración rápida

1. Instalar dependencias
```bash
npm install
```

2. Variables de entorno
```bash
cp .env.example .env.local
```

- `DATABASE_URL` (Postgres)
- `ADMIN_PASSWORD` (clave para /admin)

3. Correr local
```bash
npm run dev
```

## Deploy (Netlify)

- Build: `npm run build`
- Publish: `.next`
- Variables: `DATABASE_URL`, `ADMIN_PASSWORD`

