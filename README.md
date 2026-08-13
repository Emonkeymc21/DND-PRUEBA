# La Mesa Perdida

Sitio para reclutar jugadores de rol (D&D y otros TTRPG) en español.
Next.js 15 (App Router) · TypeScript estricto · Tailwind · Postgres.

---

## Puesta en marcha (5 minutos)

```bash
npm install
cp .env.example .env.local     # completá las variables (ver abajo)
npm run dev                    # http://localhost:3000
```

El sitio **arranca y funciona sin configurar nada**. Lo único que no anda sin
variables es el envío del formulario, que te va a avisar con un mensaje claro
en vez de fallar en silencio.

---

## Variables de entorno

| Variable | ¿Obligatoria? | Para qué |
|---|---|---|
| `DATABASE_URL` | Recomendada | Guardar postulaciones y usar el panel `/admin` |
| `ADMIN_PASSWORD` | Sí, si usás DB | Clave del panel. Mínimo 8 caracteres |
| `DISCORD_WEBHOOK_URL` | Opcional | Aviso al instante en tu celular por cada postulación |
| `NEXT_PUBLIC_SITE_URL` | Para producción | URL canónica (SEO y OpenGraph) |
| `NEXT_PUBLIC_CONTACT_*` | Opcional | Contactos de respaldo si el backend falla |

**Necesitás al menos uno de `DATABASE_URL` o `DISCORD_WEBHOOK_URL`.** Con solo
el webhook ya recibís las postulaciones (sin panel ni CSV, pero no perdés a nadie).

### Base de datos (Neon, gratis)

1. Crear un proyecto en [neon.tech](https://neon.tech).
2. Copiar la connection string. **Importante: la que dice `-pooler`.**
   Sin pooler, cada función serverless abre su propia conexión y se agota el límite.
3. Pegarla en `.env.local` y correr:

```bash
npm run db:setup
```

### Webhook de Discord

Ajustes del canal → Integraciones → Webhooks → Nuevo webhook → Copiar URL.
Pegala en `DISCORD_WEBHOOK_URL`. Cada postulación te llega como mensaje formateado.

---

## Scripts

```bash
npm run dev         # desarrollo
npm run build       # build de producción (falla si hay errores de tipos)
npm run typecheck   # sólo TypeScript
npm run check       # typecheck + lint
npm run db:setup    # crea/actualiza las tablas
```

---

## Deploy

### Vercel (recomendado)
Importás el repo, cargás las variables de entorno y listo. Cero configuración extra.

### Netlify
El `netlify.toml` ya está listo con `@netlify/plugin-nextjs`.
No declares `publish`: el plugin maneja la salida. La combinación
`publish=".next"` + `output:"standalone"` era justamente lo que rompía los deploys.

**Después de deployar, probá vos mismo el formulario.** Si aparece en `/admin`
(o te llega a Discord), está todo conectado.

---

## Estructura

```
app/
  (marketing)/page.tsx      Home
  campanias/                Listado y detalle de campañas
  simulador/                Aventura interactiva (53 escenas)
  videos/                   Videoteca
  admin/                    Panel privado (no indexado)
  api/
    rpg-signup/             POST público de postulaciones
    campaigns/              Campañas en JSON
    admin/                  Login, logout y listado protegido
components/
  forms/rpg-signup-form.tsx Formulario de 1 paso
  ui.tsx                    Kit de UI (todos los colores por tokens)
data/                       Contenido editable a mano
lib/
  db.ts       Postgres con pooling para serverless
  auth.ts     Sesión admin con cookie firmada (HMAC)
  notify.ts   Webhook de Discord
public/art/   Ilustraciones SVG propias
```

---

## Editar contenido

- **Campañas** → `data/campaigns.ts`
- **Videos** → `data/videos.ts` (y `MUSIC_VIDEO_ID` para la música ambiente)
- **Aventura del simulador** → `data/simulator/scenes.es.json`
- **Paleta de colores** → variables CSS al inicio de `app/globals.css`

> ⚠️ Antes de publicar, verificá que cada `youtubeId` siga existiendo. Los videos
> se borran o se hacen privados y queda un reproductor en negro.

---

## Qué se arregló respecto de la versión anterior

| Problema | Solución |
|---|---|
| El formulario posteaba a Google Forms vía iframe oculto y fallaba en silencio | Endpoint propio (`/api/rpg-signup`) que confirma de verdad |
| Dos sistemas de inscripción en paralelo (Forms + Postgres) | Uno solo: Postgres, con Discord como respaldo |
| `ignoreBuildErrors` tapaba errores de tipos en deploy | Build estricto |
| `next.config.js` y `.mjs` coexistiendo | Un solo config |
| `jsconfig.json` chocando con `tsconfig.json` | Eliminado |
| Cookie de admin = contraseña en texto plano | Cookie firmada con HMAC y expiración |
| Postgres sin pooling en serverless | `max: 1` + connection string con pooler |
| `@import` de fuentes después de `@tailwind` (se descartaba) | `next/font`, auto-hospedado |
| Imágenes hotlinkeadas de sitios ajenos con copyright | SVG propios en `public/art/` |
| `og.png` apuntando a un CDN externo | `og.png` local y generado |
| Preloader + cursor mágico + niebla trababan el scroll en celulares | Preloader y cursor eliminados; efectos apagados en móvil |
| Formulario de 4 pasos y 13 campos | 1 paso, 3 campos obligatorios |
| `/admin` linkeado en el menú público y en el sitemap | Fuera del menú, `noindex` y bloqueado en robots.txt |

---

## Simulador con IA y dados

### Texto libre
En cualquier escena podés elegir una opción **o escribir tu propia acción**.
El servidor narra el intento, mide tu perfil y fija una dificultad; después tirás
el d20 y el dado decide si sale.

Punto de diseño importante: la narración nunca dice "lo lográs". Si lo dijera,
escribir "gano la pelea" sería ganar la pelea. La IA describe el intento y la
reacción del mundo; el resultado lo define la tirada.

### Sin API key también funciona
Si no configurás `GEMINI_API_KEY` ni `OPENAI_API_KEY`, el simulador usa un
evaluador local por léxico (`lib/ai/heuristic.ts`): detecta el tipo de acción y
narra con plantillas. Menos inteligente, pero el sitio nunca queda roto por
depender de un servicio externo. En la interfaz aparece como "modo local".

Gemini tiene capa gratis: https://aistudio.google.com/apikey

### Perfil del jugador
Cuatro ejes que se mueven con lo que hacés:

| Eje | Rango | Qué mide |
|---|---|---|
| Creatividad | 0–100 | Cuánto se sale del camino obvio |
| Trabajo en equipo | 0–100 | Cuánto involucra al grupo |
| Caótico ↔ Legal | -100–100 | Improvisa o respeta el sistema |
| Rol ↔ Combate | -100–100 | Resuelve hablando o peleando |

Al terminar una partida podés postularte con ese perfil: viaja en la postulación
(`traits` jsonb + etiquetas) y lo ves en `/admin`. Sirve para armar mesas
compatibles antes de la primera charla.

### El dado
`components/dice/d20.tsx`. SVG de icosaedro con tumble 3D vía `rotate3d`
(compuesto en GPU) y sonido sintetizado con Web Audio — cero archivos de audio.
El resultado usa `crypto.getRandomValues` con rechazo del resto para no sesgar,
y se calcula **antes** de la animación: la animación muestra el resultado, no lo
decide.

---

## Bestiario

`/bestiario` trae criaturas del SRD 5.1 desde [dnd5eapi.co](https://www.dnd5eapi.co)
(gratis, abierta, contenido OGL). Va por un proxy propio (`/api/dnd5e`) que
cachea 24 h, con whitelist de recursos para que nadie use el dominio como open
proxy. Podés tirar un ataque contra la CA de cada criatura.

---

## Por qué no hay dependencias nuevas

| Lo típico | Qué se usó | Motivo |
|---|---|---|
| `@google/generative-ai` / `openai` | `fetch` a la REST API | Es un POST con JSON; el SDK sólo suma cold start |
| `three` / `react-three-fiber` | SVG + CSS `rotate3d` | ~600 kb para un dado no cierra en móvil |
| `@xenova/transformers` / WebLLM | Inferencia en el servidor | Un modelo en browser son 100 MB–varios GB antes del primer token |
| `howler` / archivos de audio | Web Audio sintetizado | 0 kb, funciona offline |

El bundle del cliente no creció nada respecto de la versión anterior.

---

## Motor de Machine Learning

### Cómo funciona
Cada acción de texto libre pasa por `POST /api/ml/classify`:

1. **Vectorización** (`lib/ml/vectorize.ts`): normaliza, tokeniza, aplica un
   stemmer del español y arma una bolsa de palabras TF-IDF.
2. **k-NN**: similitud coseno contra 47 ejemplos etiquetados
   (`data/ml-simulation-dataset.ts`), k=5 con voto ponderado.
3. **Perfil**: promedio ponderado de los vecinos sobre 8 dimensiones. Los turnos
   recientes pesan más (`blendVectors`).
4. **Recomendación** (`lib/ml/recommend.ts`): coseno ponderado contra 7 perfiles
   de campaña y 7 arquetipos de jugador.

Las 8 dimensiones: combate, creatividad, equipo, ley, riesgo, oscuridad, regla, humor.

### Por qué k-NN y no un transformer
`@xenova/transformers` y WebLLM descargan entre 50 MB y varios GB antes del
primer resultado. El tráfico de este sitio llega desde Instagram, en celular.
Con un vocabulario acotado (acciones de rol en español) TF-IDF + k-NN rinde
parecido, corre en microsegundos y —esto importa más— **es explicable**: la
respuesta incluye los vecinos que la produjeron, así que se puede auditar por
qué recomendó lo que recomendó.

### El modelo aprende
`/admin/modelo` tiene dos formas de ajustarlo:

- **Sliders**: cada dimensión pesa de 0 (apagada) a 3 (triplicada).
- **Corrección**: cargás un perfil, indicás qué recomendó el motor y qué
  correspondía. Los pesos se mueven en esa dirección (regla tipo perceptrón,
  `learnFromFeedback`) y se renormalizan para que cambie la *forma* del vector
  de pesos, no su magnitud.

La tasa de aprendizaje es 0.08 a propósito: diez correcciones consistentes
mueven la aguja, una sola casi no.

Todo se persiste en `ml_weights` y se audita en `ml_feedback`.

### Líneas rojas: descarte, no penalización
Si alguien marcó que no tolera horror corporal, la campaña de horror corporal
**se descarta**, no baja de puesto. Ofrecer una mesa que cruza un límite
declarado es exactamente el error que hace que alguien no vuelva.

---

## Dado 3D

`components/dice/dice3d.tsx`. Icosaedro real con Three.js: 20 caras, normales
calculadas, números generados en canvas, tres luces (dorada, púrpura, rebote
cálido) y sombra proyectada.

- **Física propia**, no `cannon-es` ni `rapier`: integración de velocidad
  angular con damping exponencial y rebote vertical amortiguado. Un motor
  completo son ~500 kb para simular un cuerpo rebotando en un plano.
- **El resultado se sortea antes de animar** con `crypto.getRandomValues` y
  rechazo del resto; después el dado se orienta para que esa cara quede arriba.
  Dejar que la física decida suena elegante hasta que el dado queda apoyado en
  una arista.
- **Fallback sin WebGL**: si el contexto no se crea, aparece un dado plano
  funcional. Pasa en navegadores viejos y con aceleración por hardware apagada.
- Cleanup completo de geometrías, materiales, texturas y renderer: sin esto cada
  montaje filtra un contexto WebGL y el navegador corta a los ~16.

---

## Audio: qué estaba mal y qué se hizo

El sistema anterior generaba interferencia por cuatro razones concretas:

| Problema | Por qué sonaba mal | Solución |
|---|---|---|
| `gain.value = x` de golpe | Un salto instantáneo de amplitud es un impulso: contiene todas las frecuencias. Ese era el "clic". | Todo sube y baja con rampas ≥20 ms |
| Ruido blanco con lowpass suave | Eso es siseo, no ambiente | Pad armónico: senoidales en octavas y quintas justas |
| Fuentes sumadas sin control | Los picos coincidían, la señal pasaba de 1.0 y la placa clippeaba | `DynamicsCompressor` en el master |
| Un `AudioContext` por componente | Varios grafos compitiendo | Un solo bus con canales de música y efectos |

Los presets están en `lib/audio/ambient.ts`. Cada uno es un acorde con
relaciones 1 : 1.5 : 2 : 3 y un LFO de 0.04–0.12 Hz sobre el filtro, para que
respire.

### Narración
`components/simulator/narration.tsx`. Elige la mejor voz en español disponible
puntuándolas (prioriza es-AR, locales y neurales; penaliza las "compact" de iOS),
y habla frase por frase modulando pitch y velocidad —las preguntas suben, la
última frase baja y se ralentiza—. Frases separadas además esquivan el bug viejo
de Chrome que corta los textos largos a los ~15 segundos.

El efecto de máquina de escribir acompaña siempre, no sólo como respaldo: la
mayoría navega en silencio desde el celular.

---

## Dependencias

Sólo se agregó **`three`**. Todo lo demás está implementado en el proyecto:

| Lo típico | Qué se usó | Motivo |
|---|---|---|
| `@react-three/fiber` + `drei` | Three.js pelado | Un objeto con loop propio no necesita reconciliador |
| `cannon-es` / `rapier` | Física propia (~60 líneas) | ~500 kb para un cuerpo rígido |
| `@xenova/transformers` | k-NN + TF-IDF | 50 MB–varios GB de descarga |
| `canvas-confetti` | `lib/fx/confetti.ts` | 60 líneas con la paleta del sitio |
| `howler` / `tone` + mp3 | Web Audio directo | 0 kb, funciona offline |

---

## Dónde publicarlo

La web no consigue jugadores por sí sola: es el lugar al que mandás a la gente
que te encontró en otro lado. En orden de efectividad real:

1. **Discord** — servidores de rol en español y canales LFG.
2. **Reddit** — r/RolArgentina, r/lfg, r/DnDLatino.
3. **Facebook** — grupos de rol regionales (siguen siendo enormes en Argentina).
4. **Instagram / TikTok** — clips cortos de escenas de tu mesa, no el link pelado.
5. **Comiquerías y jugueterías** — un flyer con QR funciona sorprendentemente bien.

Usá el campo `source` (ya viaja en cada postulación) para saber qué canal te
está trayendo gente de verdad.
