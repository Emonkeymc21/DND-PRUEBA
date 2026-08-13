# La Mesa Perdida

Sitio para reclutar jugadores de rol (D&D y otros TTRPG) en español.
Next.js 15 (App Router) · TypeScript estricto · Tailwind · Three.js · motor de
ML propio en TypeScript (con acelerador Python opcional). Sin base de datos.

---

## Puesta en marcha (5 minutos)

```bash
npm install
cp .env.example .env.local     # completá lo que quieras usar (todo opcional)
npm run dev                    # http://localhost:3000
```

El sitio **arranca y funciona sin configurar nada**: sin `GOOGLE_FORM_ACTION_URL`
ni `DISCORD_WEBHOOK_URL`, las postulaciones se guardan en el navegador de la
persona y se reintentan solas; sin `ADMIN_PASSWORD`, el panel usa `admin123`
(ver advertencia en `/admin/login`); el dado 3D, el motor de ML y el árbol
narrativo no necesitan ninguna variable.

---

## Cómo llegan las postulaciones (sin base de datos)

Este sitio no tiene base de datos propia. Cada envío del formulario
(`components/form/SignupForm.tsx`) va, en paralelo, a dos canales
independientes:

1. **Google Forms** — un POST hecho desde el servidor (`app/api/rpg-signup/route.ts`,
   vía `lib/google-forms.ts`) hacia la URL real de tu formulario. Server-side y
   no desde el navegador: así se evita el problema de CORS que tiene un POST
   directo desde el cliente, y si Google devuelve un error real se puede leer
   (con un `no-cors` desde el browser eso es imposible). Los campos van
   mapeados a los `entry.XXX` exactos:

   | Campo | Entry ID |
   |---|---|
   | Nombre | `entry.592377339` |
   | Contacto | `entry.1145937670` |
   | Experiencia | `entry.1662985932` |
   | Sistema | `entry.259189639` |
   | Temática | `entry.1977972677` |
   | Modalidad | `entry.2000145625` |
   | Frecuencia | `entry.432896089` |
   | Disponibilidad | `entry.876431454`, `entry.2140878283`, `entry.2065289993` |
   | Líneas rojas | `entry.36863628`, `entry.28201251` |

   Falta un dato que sólo vos tenés: la **URL base** de tu formulario
   (termina en `/formResponse`). Se configura en `GOOGLE_FORM_ACTION_URL`.
   Cómo conseguirla: abrí tu Google Form en modo edición → los tres puntos
   arriba a la derecha → "Obtener enlace precargado" (o inspeccioná el HTML
   del formulario público buscando el `action` del `<form>`).

2. **Discord** — webhook con toda la info en un embed, incluido el arquetipo
   y la campaña que sugirió el modelo de ML. `DISCORD_WEBHOOK_URL`.

Alcanza con que **uno** de los dos confirme para considerar la postulación
entregada. Si ninguno está configurado, o si los dos fallan (sin conexión,
Google caído), el formulario **nunca se lo dice a la persona con un cartel de
error**: la guarda en `localStorage` (`lib/signup-backup.ts`) y la reintenta
sola apenas hay red, sin que nadie tenga que volver a completar nada. La
pantalla de éxito es siempre la misma, se haya confirmado el envío o esté en
la cola de reintento — la persona nunca necesita saber cuál de los dos pasó.

---

## Variables de entorno

Todas opcionales. Ver `.env.example` para la lista completa con comentarios.
Resumen:

| Variable | Para qué |
|---|---|
| `GOOGLE_FORM_ACTION_URL` | Envío directo a tu Google Form |
| `NEXT_PUBLIC_GOOGLE_FORM_VIEW_URL` | Acceso directo a las respuestas desde `/admin` |
| `DISCORD_WEBHOOK_URL` | Aviso instantáneo por Discord |
| `ADMIN_PASSWORD` | Clave del panel (sin esto: `admin123`, ver advertencia) |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Persistencia de los pesos de ML y el árbol narrativo entre reinicios |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | Narración con IA en `/simulador` (opcional; sin esto usa un evaluador local) |
| `ML_SERVICE_URL` | Servicio Python de desarrollo (por defecto `localhost:8000`) |
| `NEXT_PUBLIC_SITE_URL` | SEO / OpenGraph |
| `NEXT_PUBLIC_CONTACT_*` | Contactos que se muestran junto a la confirmación |

---

## Scripts

```bash
npm run dev         # desarrollo
npm run build        # build de producción (falla si hay errores de tipos)
npm run typecheck    # sólo TypeScript
npm run check        # typecheck + lint
```

---

## Deploy

### Vercel (recomendado)
Importás el repo, cargás las variables que quieras usar y listo — cero
configuración manual. `vercel.json` ya declara el framework.

### Netlify
`netlify.toml` incluido, con `@netlify/plugin-nextjs`. No declares `publish`
manualmente: el plugin maneja la salida.

**Probá el formulario vos mismo después de deployar.** Si te llega por
Discord o aparece en tu Google Form, está todo conectado.

---

## Estructura

```
app/
  (marketing)/page.tsx      Home
  campanias/                 Listado y detalle de campañas
  simulador/                 Aventura de 53 escenas (motor de ML de 8 ejes)
  encrucijada/                Escena corta con árbol narrativo Python/TS
  bestiario/                 Criaturas del SRD 5.1 en vivo
  videos/                     Videoteca
  admin/                       Panel privado (no indexado)
    modelo/                    Ajuste de pesos del recomendador
    arbol/                      Editor del árbol narrativo
  api/
    rpg-signup/                Google Forms + Discord, sin base de datos
    simulate/                  Árbol narrativo (Python con fallback a TS)
    ml/classify, ml/feedback    Motor de perfil de 8 dimensiones
    admin/tree/                 CRUD de nodos del árbol (admin)
    campaigns/, dnd5e/           APIs de contenido
components/
  form/SignupForm.tsx          Formulario único de inscripción
  audio/AudioPlayer.tsx        Música de fondo (Howler.js)
  dice/dice3d.tsx              D20 real en Three.js
  admin/tree-editor.tsx        Editor visual del árbol narrativo
data/
  ml-simulation-dataset.ts     Arquetipos, campañas, corpus de entrenamiento
  role_tree_dataset.json       Árbol narrativo de la Encrucijada
  simulator/scenes.es.json     Las 53 escenas del simulador principal
lib/
  google-forms.ts              Mapeo de campos y envío server-side
  notify.ts                    Webhook de Discord
  signup-backup.ts             Cola de reintento local
  kv.ts                        Persistencia opcional vía Upstash Redis
  auth.ts                      Sesión admin con cookie firmada (HMAC)
  ml/                          Vectorización, k-NN, recomendación, pesos
  ai/tree-fallback.ts           Motor TS del árbol narrativo
ml_service/                    FastAPI + scikit-learn (sólo desarrollo local)
public/art/                    Ilustraciones SVG propias
public/audio/                   Pistas de música (no incluidas, ver su README)
```

---

## Editar contenido

- **Campañas** → `data/campaigns.ts`
- **Videos** → `data/videos.ts` (y `MUSIC_VIDEO_ID` si aplica)
- **Aventura del simulador principal** → `data/simulator/scenes.es.json`
- **Árbol de la Encrucijada** → `data/role_tree_dataset.json`, o directamente
  desde `/admin/arbol` sin tocar código
- **Paleta de colores** → variables CSS al inicio de `app/globals.css`

---

## Panel admin

`/admin/login` acepta la clave de `ADMIN_PASSWORD`. Sin esa variable
configurada, acepta **`admin123`** — está escrito en este código fuente y no
es secreto. Sigue pasando por cookie firmada (HMAC), comparación en tiempo
constante y rate limiting, pero **configurá tu propia clave antes de publicar
el sitio**. La pantalla de login lo recuerda con una advertencia visible.

Desde ahí:
- **Enlaces directos** a tu Google Form y su hoja de respuestas.
- **`/admin/modelo`** — ajustá cuánto pesa cada una de las 8 dimensiones al
  recomendar campañas, o corregí una recomendación para que el motor aprenda
  (regla incremental tipo perceptrón, tasa 0.08 para que una sola corrección
  no reconfigure todo).
- **`/admin/arbol`** — agregá o editá nodos del árbol narrativo de la
  Encrucijada, hasta 15 opciones por nodo, sin tocar código. Los nodos que
  agregás se combinan con el dataset base en tiempo de lectura; el archivo
  JSON original nunca se modifica (en Vercel el filesystem del deploy es de
  sólo lectura).

---

## Motor de Machine Learning

Dos motores de ML conviven en el sitio, con propósitos distintos:

### 1. Perfil de 8 dimensiones (simulador principal, `/simulador`)
Cada acción de texto libre pasa por `/api/ml/classify`: vectorización TF-IDF
con stemmer del español, k-NN (k=5) contra 47 ejemplos etiquetados
(`data/ml-simulation-dataset.ts`), promedio ponderado sobre 8 dimensiones
(combate, creatividad, equipo, ley, riesgo, oscuridad, regla, humor), y
recomendación de campaña por coseno ponderado. Los pesos se ajustan en
`/admin/modelo` y se guardan en Upstash si está configurado.

### 2. Árbol narrativo (Encrucijada, `/encrucijada`)
Un árbol de decisiones más chico (`data/role_tree_dataset.json`, nodo raíz
con 10 opciones) que se resuelve contra un servicio **Python con FastAPI y
scikit-learn** (`ml_service/`) si está corriendo en desarrollo, o contra un
motor TypeScript equivalente (`lib/ai/tree-fallback.ts`) que es el que corre
siempre en producción. Clasifica en tres arquetipos: Guerrero Implacable,
Estratega Erudito, Líder Inspirador.

**Por qué el motor de producción es TypeScript y no Python:** Vercel y
Netlify son serverless — no hay proceso Python persistente escuchando en
ningún puerto ahí. Levantar `ml_service/` es sólo para desarrollo local:

```bash
cd ml_service
pip install -r requirements.txt
uvicorn app:app --port 8000 --reload
```

Los nodos que se agregan desde `/admin/arbol` los ve el motor TypeScript (el
que realmente corre en producción); el servicio Python de desarrollo lee el
JSON estático sin esos agregados — es una limitación conocida y aceptable
dado ese rol de acelerador de desarrollo, nunca fuente de verdad.

---

## Dado 3D

`components/dice/dice3d.tsx`. Icosaedro real en Three.js: 20 caras con
normales calculadas, `MeshStandardMaterial` dorado/místico, números generados
en canvas (no SVG) mapeados como textura sobre la malla, tres luces (dorada,
púrpura, rebote cálido) y sombra proyectada sobre un plano. Nada de SVG plano
ni CSS 2D en la implementación principal.

- **Física propia**, no `cannon-es` ni `rapier`: integración de velocidad
  angular con damping exponencial y rebote vertical amortiguado en los tres
  ejes.
- **El resultado (1 a 20) se sortea antes de animar**, con
  `crypto.getRandomValues` y rechazo del resto para no sesgar; el dado se
  orienta después para que esa cara quede arriba. Dejar que la física decida
  suena elegante hasta que el dado queda apoyado en una arista.
- **Fallback sin WebGL**: si el contexto no se puede crear (navegadores
  viejos, aceleración por hardware apagada), aparece un dado plano funcional
  en vez de romper la página — nunca es el camino principal.

---

## Audio

`components/audio/AudioPlayer.tsx` usa Howler.js con pistas de audio reales
cargadas desde `/public/audio/` — nada de osciladores sintéticos generando la
música de fondo. Los archivos no vienen incluidos (ver
`public/audio/README.md` para dónde conseguirlos gratis); si falta un
archivo, el reproductor no rompe ni muestra ningún aviso, simplemente no
suena nada hasta que pongas el mp3 correspondiente.

El SFX corto del dado (tirada, crítico, pifia) sí sigue sintetizado con Web
Audio: son efectos de ~50ms con envolvente completa, no ambiente de fondo, y
ahí la síntesis nunca fue el problema — el ruido de versiones anteriores
venía de osciladores sin envolvente y ruido blanco sin filtrar, no de la
síntesis en sí misma.

### Narración
`components/simulator/narration.tsx`. Web Speech API con la mejor voz en
español disponible (prioriza es-AR, locales y neurales), modulando pitch y
ritmo por frase — las preguntas suben, la última frase se ralentiza. El
efecto de máquina de escribir acompaña siempre, no sólo como respaldo cuando
falla la voz.

---

## Bestiario

`/bestiario` trae criaturas del SRD 5.1 desde
[dnd5eapi.co](https://www.dnd5eapi.co) (gratis, abierta, contenido OGL) vía
un proxy propio (`/api/dnd5e`) que cachea 24h con whitelist de recursos.

---

## Dependencias

| Necesidad | Qué se usó | Por qué no la alternativa típica |
|---|---|---|
| Dado 3D | Three.js puro | `@react-three/fiber` suma un reconciliador para un objeto con loop propio |
| Física del dado | ~60 líneas propias | `cannon-es`/`rapier` son ~500 kb para un cuerpo rebotando en un plano |
| Perfil de texto libre | TF-IDF + k-NN propio | Un transformer (`@xenova/transformers`) son 50 MB–varios GB antes del primer resultado |
| Confetti en críticos | `lib/fx/confetti.ts` (~60 líneas) | Evita una dependencia más para un efecto simple |
| Persistencia opcional | Upstash Redis vía `fetch` puro | Sin SDK, sin SQL, mismo patrón que el resto de las integraciones externas del proyecto |
| Música de fondo | Howler.js + archivos reales | Osciladores sintéticos para música de fondo larga suenan a ruido, no a ambiente |

---

## Dónde publicarlo

La web no consigue jugadores por sí sola: es el lugar al que mandás a la
gente que te encontró en otro lado. En orden de efectividad real:

1. **Discord** — servidores de rol en español y canales LFG.
2. **Reddit** — r/RolArgentina, r/lfg, r/DnDLatino.
3. **Facebook** — grupos de rol regionales.
4. **Instagram / TikTok** — clips cortos de escenas de tu mesa, no el link pelado.
5. **Comiquerías y jugueterías** — un flyer con QR funciona sorprendentemente bien.
