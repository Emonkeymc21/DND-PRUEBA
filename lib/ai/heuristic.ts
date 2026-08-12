import type { TraitDelta } from "@/lib/traits";

/**
 * Evaluador de respaldo, 100% determinista y sin red.
 *
 * Por qué existe: si el sitio depende de una API key para que el simulador
 * funcione, entonces el simulador está roto para cualquiera que clone el repo,
 * y también durante cualquier caída del proveedor. Esto no es tan bueno como un
 * LLM leyendo la intención, pero es honesto: detecta el tipo de acción por
 * léxico y arma una narración con plantillas.
 *
 * Todo en español rioplatense, que es como escribe la gente que usa el sitio.
 */

type Signal = {
  key: keyof TraitDelta;
  amount: number;
  words: string[];
};

/** Cada grupo mueve un eje. Las palabras van sin tildes: el texto se normaliza. */
const SIGNALS: Signal[] = [
  // --- Combate ---
  {
    key: "combate",
    amount: 11,
    words: [
      "atac", "peleo", "pelear", "golpe", "espada", "hacha", "arco", "flecha",
      "disparo", "mato", "matar", "cortar", "embest", "patada", "puno", "puno",
      "lucho", "luchar", "arremet", "degoll", "apunalar", "apunal", "hiero",
    ],
  },
  // --- Rol / narrativa ---
  {
    key: "combate",
    amount: -11,
    words: [
      "hablo", "hablar", "converso", "pregunto", "negoci", "convenzo", "convencer",
      "persuad", "escucho", "saludo", "presento", "cuento", "explico", "propongo",
      "miento", "mentir", "seduzco", "calmo", "tranquiliz", "razono", "dialog",
    ],
  },
  // --- Caótico ---
  {
    key: "ley",
    amount: -10,
    words: [
      "robo", "robar", "escapo", "huyo", "prendo fuego", "quemo", "rompo",
      "ignoro", "traiciono", "improviso", "sin pensar", "me arriesgo", "apuesto",
      "hago lo que quiero", "a lo loco", "de una", "al toque", "sabotaje",
    ],
  },
  // --- Legal ---
  {
    key: "ley",
    amount: 10,
    words: [
      "plan", "planeo", "organizo", "ordeno", "respeto", "cumplo", "acuerdo",
      "trato", "contrato", "pacto", "aviso", "consulto", "reglas", "protocolo",
      "con cuidado", "metodico", "paso a paso", "primero verifico",
    ],
  },
  // --- Equipo ---
  {
    key: "equipo",
    amount: 12,
    words: [
      "nosotros", "equipo", "grupo", "party", "companero", "companera", "juntos",
      "ayudo", "ayudar", "cubro", "protejo", "aviso al grupo", "les digo",
      "coordino", "curo", "defiendo a", "espero al", "comparto",
    ],
  },
  // --- Lobo solitario ---
  {
    key: "equipo",
    amount: -9,
    words: [
      "solo", "sola", "por mi cuenta", "yo me encargo", "me adelanto",
      "sin avisar", "a escondidas", "me separo", "no les digo", "yo solo",
    ],
  },
  // --- Creatividad ---
  {
    key: "creatividad",
    amount: 13,
    words: [
      "uso el", "combino", "improviso", "invento", "distraigo", "trampa",
      "disfraz", "finjo", "simulo", "aprovecho", "en vez de", "se me ocurre",
      "y si", "ato", "empujo", "tiro la", "hago pasar", "desvio", "palanca",
      "cuerda", "antorcha", "aceite", "polvo", "espejo",
    ],
  },
];

/** Saca tildes y pasa a minúscula para comparar sin sorpresas. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export type HeuristicResult = {
  delta: TraitDelta;
  narration: string;
  /** Dificultad sugerida para la tirada, 8..18. */
  dc: number;
  /** Qué tipo de acción detectó, para elegir la narración. */
  kind: "combate" | "social" | "astucia" | "cautela" | "generico";
};

function detectKind(t: string): HeuristicResult["kind"] {
  const has = (arr: string[]) => arr.some((w) => t.includes(w));

  if (has(["atac", "peleo", "golpe", "espada", "disparo", "mato", "lucho", "hacha"]))
    return "combate";
  if (has(["hablo", "pregunto", "negoci", "convenzo", "persuad", "miento", "saludo", "propongo"]))
    return "social";
  if (has(["distraigo", "trampa", "disfraz", "finjo", "invento", "combino", "aprovecho", "se me ocurre"]))
    return "astucia";
  if (has(["escondo", "sigilo", "observo", "espero", "reviso", "con cuidado", "despacio", "miro"]))
    return "cautela";
  return "generico";
}

const NARRATIONS: Record<HeuristicResult["kind"], string[]> = {
  combate: [
    "Te movés primero y el aire se corta. No hay vuelta atrás: ahora todo se decide en el próximo intercambio.",
    "Elegís la fuerza. La escena se tensa de golpe y todos los ojos van hacia vos.",
  ],
  social: [
    "Tus palabras cambian la temperatura del lugar. Alguien afloja los hombros; otro, no tanto.",
    "Hablás y por un segundo el problema deja de ser un problema y pasa a ser una conversación.",
  ],
  astucia: [
    "Nadie esperaba eso. La idea es rara y por eso mismo puede llegar a funcionar.",
    "Torcés la situación para el lado que no estaba previsto. La mesa levanta una ceja.",
  ],
  cautela: [
    "Te tomás un segundo antes de actuar y eso ya te da una ventaja: ves algo que antes no estaba.",
    "Vas despacio. El detalle que te faltaba aparece justo donde no estabas mirando.",
  ],
  generico: [
    "Tu decisión mueve la escena hacia un lugar nuevo. El resultado todavía está abierto.",
    "Actuás. El mundo responde, y no exactamente como esperabas.",
  ],
};

/** Elección estable a partir del texto: misma entrada, misma narración. */
function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length]!;
}

export function evaluateHeuristic(input: string, sceneTitle: string): HeuristicResult {
  const t = normalize(input);
  const delta: TraitDelta = {};

  for (const sig of SIGNALS) {
    const hits = sig.words.filter((w) => t.includes(w)).length;
    if (hits === 0) continue;
    // Tope por grupo: que repetir una palabra 8 veces no dispare el eje.
    const amount = sig.amount * Math.min(hits, 2);
    delta[sig.key] = (delta[sig.key] ?? 0) + amount;
  }

  // Respuestas largas y elaboradas indican involucramiento con la ficción.
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words >= 25) delta.creatividad = (delta.creatividad ?? 0) + 6;
  else if (words <= 3) delta.creatividad = (delta.creatividad ?? 0) - 4;

  const kind = detectKind(t);

  // Dificultad: lo audaz cuesta más, lo cauto menos.
  const dc =
    kind === "astucia" ? 14 : kind === "combate" ? 13 : kind === "social" ? 12 : kind === "cautela" ? 10 : 12;

  return {
    delta,
    narration: pick(NARRATIONS[kind], input + sceneTitle),
    dc,
    kind,
  };
}
