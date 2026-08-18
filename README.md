# La Mesa Perdida — Angular 17

Migración de la v8 (Next.js) a Angular 17+ (standalone components, signals,
control flow `@if`/`@for`) + un backend Express mínimo.

---

## Por qué hay un backend, si Angular es "sólo frontend"

Angular compila a JavaScript que se sirve **tal cual** a cualquier visitante
del sitio. Si el token de escritura de Upstash, el webhook de Discord, o la
lógica de "¿esta contraseña es correcta?" vivieran en ese bundle, cualquiera
con el inspector del navegador abierto los vería y podría usarlos.

`server/` es un Express chico que retiene esos tres secretos exactamente
donde vivían en la versión Next.js (dentro de `app/api/*/route.ts`, que
corre en un servidor). Angular le habla a este backend por HTTP; nunca habla
directo con Google Forms, Discord o Upstash.

```
Angular (browser)  →  server/index.mjs (Node)  →  Google Forms / Discord / Upstash
     bundle público         retiene secretos            APIs externas
```

---

## Puesta en marcha

```bash
# 1. Instalar todo
npm install
cd server && npm install && cd ..

# 2. Configurar el backend (opcional — funciona sin nada configurado)
cp server/.env.example server/.env

# 3. Levantar los dos procesos juntos
npm run dev:all
```

`npm run dev:all` levanta el backend en `:8787` y `ng serve` en `:4200` con
`proxy.conf.json` reenviando `/api/*` de uno a otro. Abrí `http://localhost:4200`.

### Sólo Angular (sin backend)
```bash
npm start
```
Funciona igual, pero cualquier request a `/api/*` falla — el formulario
guarda en `localStorage` y reintenta solo (mismo comportamiento que sin
conexión), el árbol usa sólo el dataset base sin overlay del Master, y
`/admin` no deja pasar (el guard depende de la sesión del backend).

### Producción
```bash
npm run build              # genera dist/la-mesa-perdida-angular/browser
cd server && npm start      # sirve el build Y expone /api en el mismo proceso
```

---

## Alcance de esta migración (léase antes de asumir que está completo)

Se migró: routing con lazy loading, dado 3D real en Three.js, formulario
único de inscripción, la Encrucijada (árbol narrativo con texto libre),
panel admin (login, dashboard, ajuste de pesos del modelo de ML, editor del
árbol narrativo), y los tres servicios de integración (Google Forms,
Discord, Upstash) — todos con el mismo razonamiento de seguridad que la
versión Next.js.

**Se agregó en esta segunda entrega**: el Bestiario (`/bestiario`), con el
mismo diseño que la v8 — proxy cacheado 24h en el backend Express
(`/api/dnd5e`, whitelist de recursos) y componente Angular con lista +
detalle + tirada de ataque. De paso corregí una diferencia real de
comportamiento con la versión React: ahí se usaba `key={selected.index}`
para resetear el dado al cambiar de criatura (fuerza un remount completo);
Angular no tiene equivalente a `key`, así que `D20DiceComponent` ahora
implementa `ngOnChanges` para resetear su estado visual cuando cambian
`dc`/`mod`/`label` — sin destruir y recrear la escena de Three.js completa,
que es más barato que el remount original.

**Se agregó en esta tercera entrega**: música de fondo con Howler.js
(`AudioPlayerComponent`, en el header de toda la app). Mismo diseño que la
versión Next.js: carga pistas reales desde `/public/audio/` (no incluidas,
ver `public/audio/README.md`), verifica que el archivo exista antes de
intentar reproducirlo (`HEAD` request) y no muestra ningún aviso si falta —
el botón simplemente no suena hasta que pongas el mp3. Fade de entrada/salida
de 1.2s para evitar el "clic" de un cambio de volumen instantáneo.

**Deliberadamente fuera de esta entrega** — no está fingido como completo,
está ausente:

- El simulador principal de 53 escenas (`/simulador` en la v8, con motor de
  8 dimensiones + narración por voz + texto libre). Es la pieza más grande
  del proyecto original; portar sus ~700 líneas de lógica de escenas +
  narración + Web Speech API queda para la próxima iteración, con turno
  dedicado completo.
- El SFX corto del dado (sonido de la tirada, crítico, pifia) — el dado gira
  y muestra el resultado en silencio; sólo se portó la música de fondo.
- El servicio Python (`ml_service/`) de la v8 no se tocó ni se necesita acá:
  es independiente del framework de frontend.

## Qué se verificó y qué no

**Verificado por lectura y por lógica**: el algoritmo TF-IDF + k-NN
(`MlVectorizeService`) y el recomendador (`MlRecommendService`) son puertos
mecánicos de código ya probado numéricamente en la versión Next.js contra el
mismo corpus — no se tocó el algoritmo, sólo el mecanismo de inyección.

**No verificado — no hay forma de hacerlo sin `npm install` y `ng build`,
que este entorno no puede ejecutar (sin acceso a red)**: que el proyecto
compile. Angular es más estricto que Next.js en la forma exacta de
`angular.json`, en el uso de `@Input`/`@Output` con Standalone Components, y
en el nuevo control flow `@if`/`@for`. Escribí todo el código a mano,
siguiendo la forma exacta que genera el Angular CLI, pero un error de tipeo
en un signal o un binding puede aparecer recién al compilar. Corré
`npm install && npm run typecheck && npm run build` como primer paso y
pasame lo que tire si falla algo.
