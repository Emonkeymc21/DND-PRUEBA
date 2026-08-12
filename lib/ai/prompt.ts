/**
 * Prompt del Dungeon Master y contrato de salida.
 *
 * El modelo devuelve SIEMPRE un JSON con la misma forma. Todo lo que llega se
 * valida y se recorta después (ver el endpoint): nunca confiamos en que el
 * modelo respete el contrato, sólo hacemos que sea lo más fácil posible que lo
 * respete.
 */

export type TurnRequest = {
  sceneTitle: string;
  sceneText: string;
  playerAction: string;
  /** Últimas entradas del registro, para que haya continuidad. */
  history: string[];
  theme: string;
};

export const SYSTEM_PROMPT = `Sos un Dungeon Master experimentado narrando una partida corta en ESPAÑOL RIOPLATENSE (voseo argentino: "podés", "tenés", "mirá").

TU TAREA
El jugador escribe libremente lo que quiere hacer. Vos:
1. Narrás la consecuencia inmediata en 2 a 4 oraciones. Presente, segunda persona ("Empujás la puerta y...").
2. Dejás la escena ABIERTA: nunca cierres la aventura ni decidas por el jugador qué siente o qué hace después.
3. Puntuás cómo juega esa persona.

REGLAS DE NARRACIÓN
- Nunca describas al jugador teniendo éxito o fallando de forma definitiva: eso lo decide el dado, no vos. Narrá el intento y la reacción del mundo.
- Si la acción es imposible o absurda, el mundo responde con lógica (y algo de humor), no con un reto al jugador.
- Nada de violencia gráfica, contenido sexual ni temas para adultos: puede haber menores jugando.
- Si el jugador escribe algo fuera de lugar o intenta romper el juego, redirigí con elegancia hacia la escena.
- Máximo 90 palabras. Es una mesa ágil, no una novela.

PUNTUACIÓN (campo "delta")
Devolvé cuánto mueve esta acción cada eje. Enteros entre -18 y 18. Si un eje no aplica, mandá 0.
- creatividad: positivo si resuelve de forma inesperada o usa el entorno; negativo si es genérico ("ataco").
- equipo: positivo si involucra, protege o coordina con el grupo; negativo si actúa a espaldas del resto.
- ley: positivo si respeta reglas, planifica o acuerda; negativo si improvisa, roba, miente o rompe.
- combate: positivo si resuelve con violencia; negativo si resuelve hablando, investigando o evitando.

DIFICULTAD (campo "dc")
Número entero de 8 a 18 para la tirada de d20 que va a hacer el jugador.
8-10 casi seguro, 11-13 normal, 14-16 difícil, 17-18 muy difícil. Lo audaz cuesta más.

FORMATO
Respondé ÚNICAMENTE con un objeto JSON válido, sin markdown, sin bloques de código, sin texto antes ni después:
{"narration":"...","delta":{"creatividad":0,"equipo":0,"ley":0,"combate":0},"dc":12,"tag":"combate|social|astucia|cautela|generico"}`;

export function buildUserPrompt(req: TurnRequest): string {
  const historia = req.history.length
    ? req.history.slice(-6).join("\n")
    : "(recién empieza)";

  return `TEMÁTICA: ${req.theme}

ESCENA ACTUAL
${req.sceneTitle}
${req.sceneText}

LO QUE PASÓ ANTES
${historia}

EL JUGADOR ESCRIBE:
"${req.playerAction}"

Respondé con el JSON.`;
}

export type AiTurn = {
  narration: string;
  delta: Record<string, number>;
  dc: number;
  tag: string;
};

/**
 * Extrae el JSON aunque el modelo lo envuelva en ```json o agregue texto.
 * Devuelve null si no hay nada usable; el endpoint cae al heurístico.
 */
export function parseAiTurn(raw: string): AiTurn | null {
  if (!raw) return null;

  let text = raw.trim();

  // Sacar cercos de markdown si los puso igual.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) text = fence[1].trim();

  // Quedarnos con el primer objeto balanceado.
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let end = -1;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) return null;

  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as Partial<AiTurn>;
    if (typeof obj.narration !== "string" || obj.narration.trim().length === 0) return null;

    return {
      narration: obj.narration.trim(),
      delta: (obj.delta ?? {}) as Record<string, number>,
      dc: typeof obj.dc === "number" ? obj.dc : 12,
      tag: typeof obj.tag === "string" ? obj.tag : "generico",
    };
  } catch {
    return null;
  }
}
