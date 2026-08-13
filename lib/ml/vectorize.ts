import { DIMENSIONS, TRAINING_SET, zeroVector, type Vector, type Dimension } from "@/data/ml-simulation-dataset";

/**
 * Vectorización de texto libre en español.
 *
 * Pipeline: normalizar → tokenizar → stemming liviano → bolsa de palabras con
 * pesos IDF → similitud con cada ejemplo etiquetado.
 *
 * Por qué no embeddings de un transformer: un modelo de embeddings decente son
 * 50-100 MB. Acá el vocabulario es acotado (acciones de rol en español) y la
 * señal está en unas 400 palabras clave. Un TF-IDF sobre un corpus etiquetado a
 * mano rinde parecido para este dominio y corre en microsegundos.
 */

// ---------------------------------------------------------------------------
// Normalización y tokenización
// ---------------------------------------------------------------------------

/** Palabras vacías del español: no aportan señal y ensucian la similitud. */
const STOPWORDS = new Set([
  "a", "al", "algo", "ante", "antes", "aqui", "asi", "aun", "aunque", "cada",
  "como", "con", "contra", "cual", "cuando", "de", "del", "desde", "donde",
  "dos", "el", "ella", "ellos", "en", "entre", "era", "eso", "esta", "este",
  "esto", "hasta", "hay", "la", "las", "le", "les", "lo", "los", "mas", "me",
  "mi", "mientras", "muy", "nada", "ni", "no", "nos", "o", "para", "pero",
  "por", "porque", "que", "se", "ser", "si", "sin", "sobre", "solo", "son",
  "su", "sus", "tan", "te", "todo", "un", "una", "uno", "y", "ya", "yo",
]);

/**
 * Sufijos verbales y nominales del español, de más largo a más corto.
 * El orden importa: hay que sacar "aríamos" antes que "os".
 */
const SUFFIXES = [
  "abamos", "ariamos", "eriamos", "iriamos", "issemos", "aramos",
  "aremos", "eremos", "iremos", "abais", "arian", "erian", "irian",
  "aban", "aria", "eria", "iria", "ando", "endo", "aron", "eron",
  "ieron", "aste", "iste", "amos", "emos", "imos", "aran", "eran",
  "iran", "ada", "ado", "ida", "ido", "ara", "era", "ira", "are",
  "ere", "ire", "ais", "eis", "mos", "ban", "ran", "sen", "ses",
  "an", "en", "es", "os", "as", "ar", "er", "ir", "ia", "io", "e", "a", "o", "s",
];

/** Saca tildes y pasa a minúscula. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Stemmer liviano (estilo Snowball recortado).
 * No busca corrección lingüística, busca que "ataco", "atacar" y "atacando"
 * caigan en el mismo token.
 */
export function stem(word: string): string {
  if (word.length <= 4) return word;

  for (const suf of SUFFIXES) {
    if (word.length - suf.length >= 3 && word.endsWith(suf)) {
      return word.slice(0, word.length - suf.length);
    }
  }
  return word;
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

// ---------------------------------------------------------------------------
// IDF sobre el corpus etiquetado
// ---------------------------------------------------------------------------

type Bag = Map<string, number>;

/** Bolsa de palabras con TF normalizado por la longitud del documento. */
function bagOf(text: string): Bag {
  const tokens = tokenize(text);
  const bag: Bag = new Map();
  if (tokens.length === 0) return bag;

  for (const t of tokens) bag.set(t, (bag.get(t) ?? 0) + 1);
  for (const [k, v] of bag) bag.set(k, v / tokens.length);
  return bag;
}

/**
 * IDF se calcula una sola vez, al cargar el módulo. En serverless el módulo
 * queda cacheado entre invocaciones de la misma instancia, así que el costo se
 * paga una vez por cold start (~1 ms con 48 ejemplos).
 */
const CORPUS = TRAINING_SET.map((ex) => ({ bag: bagOf(ex.text), ex }));

const IDF: Map<string, number> = (() => {
  const df = new Map<string, number>();
  for (const { bag } of CORPUS) {
    for (const term of bag.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  }

  const N = CORPUS.length;
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    // IDF suavizado: evita divisiones por cero y aplasta términos ubicuos.
    idf.set(term, Math.log((N + 1) / (count + 1)) + 1);
  }
  return idf;
})();

/** Un término que nunca vimos es informativo, no ruido: le damos el IDF máximo. */
const MAX_IDF = Math.log(CORPUS.length + 1) + 1;

function tfidf(bag: Bag): Bag {
  const out: Bag = new Map();
  for (const [term, tf] of bag) out.set(term, tf * (IDF.get(term) ?? MAX_IDF));
  return out;
}

/** Similitud coseno entre dos bolsas dispersas. */
export function cosineSimilarity(a: Bag, b: Bag): number {
  // Recorremos la más chica: el costo es O(min(|a|,|b|)).
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];

  let dot = 0;
  for (const [term, va] of small) {
    const vb = large.get(term);
    if (vb !== undefined) dot += va * vb;
  }
  if (dot === 0) return 0;

  let na = 0;
  for (const v of a.values()) na += v * v;
  let nb = 0;
  for (const v of b.values()) nb += v * v;

  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// ---------------------------------------------------------------------------
// k-NN sobre el texto libre
// ---------------------------------------------------------------------------

export type Neighbor = {
  text: string;
  archetype: string;
  similarity: number;
};

export type TextInference = {
  /** Vector resultante, 0..1 por dimensión. */
  vector: Vector;
  /** Vecinos que más pesaron, para poder explicar la decisión. */
  neighbors: Neighbor[];
  /** 0..1. Bajo = el texto no se parece a nada conocido. */
  confidence: number;
};

/**
 * Clasifica un texto libre contra el corpus.
 *
 * k=5 con voto ponderado por similitud. El vector resultante es el promedio
 * ponderado de los `push` de los vecinos, mezclado contra el neutro según la
 * confianza: si el texto no se parece a nada, el resultado tiende a 0.5 en vez
 * de inventar una lectura fuerte.
 */
export function inferFromText(text: string, k = 5): TextInference {
  const query = tfidf(bagOf(text));

  if (query.size === 0) {
    return { vector: zeroVector(), neighbors: [], confidence: 0 };
  }

  const scored = CORPUS.map(({ bag, ex }) => ({
    ex,
    similarity: cosineSimilarity(query, tfidf(bag)),
  }))
    .filter((s) => s.similarity > 0.01)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  if (scored.length === 0) {
    return { vector: zeroVector(), neighbors: [], confidence: 0 };
  }

  const totalSim = scored.reduce((acc, s) => acc + s.similarity, 0);

  // Promedio ponderado, dimensión por dimensión, contando sólo los vecinos que
  // realmente opinan sobre esa dimensión.
  const acc = zeroVector();
  for (const dim of DIMENSIONS) {
    let weighted = 0;
    let weight = 0;
    for (const s of scored) {
      const push = s.ex.push[dim as Dimension];
      if (push === undefined) continue;
      weighted += push * s.similarity;
      weight += s.similarity;
    }
    acc[dim] = weight > 0 ? weighted / weight : 0.5;
  }

  // Confianza: la mejor similitud, atenuada si hubo pocos vecinos.
  const best = scored[0]!.similarity;
  const confidence = Math.min(1, best * (0.6 + 0.4 * (scored.length / k)));

  // Mezcla con el neutro: poca confianza ⇒ poco movimiento.
  const blended = zeroVector();
  for (const dim of DIMENSIONS) {
    blended[dim] = 0.5 + (acc[dim] - 0.5) * confidence;
  }

  return {
    vector: blended,
    neighbors: scored.map((s) => ({
      text: s.ex.text,
      archetype: s.ex.archetype,
      similarity: Number(s.similarity.toFixed(4)),
    })),
    confidence: Number(confidence.toFixed(4)),
    // El totalSim no se expone: sólo servía para el promedio.
  };
}

/** Se exporta para los tests y para el panel de diagnóstico del Master. */
export const _internals = { bagOf, tfidf, IDF, CORPUS_SIZE: CORPUS.length };
