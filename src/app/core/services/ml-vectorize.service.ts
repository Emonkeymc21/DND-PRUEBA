import { Injectable } from "@angular/core";
import { DIMENSIONS, TRAINING_SET, zeroVector, type Vector, type Dimension } from "../data/ml-simulation-dataset";

/**
 * Vectorización de texto libre en español: TF-IDF + similitud coseno contra
 * un corpus de 47 ejemplos etiquetados. Puerto directo de la versión
 * Next.js (lib/ml/vectorize.ts) — el algoritmo es idéntico, sólo cambia el
 * mecanismo de inyección (servicio Angular en vez de módulo de Next.js).
 * Verificado numéricamente contra el mismo corpus antes de portarlo.
 */

const STOPWORDS = new Set([
  "a", "al", "algo", "ante", "antes", "aqui", "asi", "aun", "aunque", "cada",
  "como", "con", "contra", "cual", "cuando", "de", "del", "desde", "donde",
  "dos", "el", "ella", "ellos", "en", "entre", "era", "eso", "esta", "este",
  "esto", "hasta", "hay", "la", "las", "le", "les", "lo", "los", "mas", "me",
  "mi", "mientras", "muy", "nada", "ni", "no", "nos", "o", "para", "pero",
  "por", "porque", "que", "se", "ser", "si", "sin", "sobre", "solo", "son",
  "su", "sus", "tan", "te", "todo", "un", "una", "uno", "y", "ya", "yo",
]);

const SUFFIXES = [
  "abamos", "ariamos", "eriamos", "iriamos", "issemos", "aramos",
  "aremos", "eremos", "iremos", "abais", "arian", "erian", "irian",
  "aban", "aria", "eria", "iria", "ando", "endo", "aron", "eron",
  "ieron", "aste", "iste", "amos", "emos", "imos", "aran", "eran",
  "iran", "ada", "ado", "ida", "ido", "ara", "era", "ira", "are",
  "ere", "ire", "ais", "eis", "mos", "ban", "ran", "sen", "ses",
  "an", "en", "es", "os", "as", "ar", "er", "ir", "ia", "io", "e", "a", "o", "s",
];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

type Bag = Map<string, number>;

function bagOf(text: string): Bag {
  const tokens = tokenize(text);
  const bag: Bag = new Map();
  if (tokens.length === 0) return bag;
  for (const t of tokens) bag.set(t, (bag.get(t) ?? 0) + 1);
  for (const [k, v] of bag) bag.set(k, v / tokens.length);
  return bag;
}

export type Neighbor = { text: string; archetype: string; similarity: number };
export type TextInference = { vector: Vector; neighbors: Neighbor[]; confidence: number };

@Injectable({ providedIn: "root" })
export class MlVectorizeService {
  private corpus: Array<{ bag: Bag; ex: (typeof TRAINING_SET)[number] }>;
  private idf: Map<string, number>;
  private maxIdf: number;

  constructor() {
    // Se calcula una sola vez, al instanciarse el servicio (singleton `root`),
    // no en cada clasificación.
    this.corpus = TRAINING_SET.map((ex) => ({ bag: bagOf(ex.text), ex }));

    const df = new Map<string, number>();
    for (const { bag } of this.corpus) {
      for (const term of bag.keys()) df.set(term, (df.get(term) ?? 0) + 1);
    }

    const n = this.corpus.length;
    this.idf = new Map<string, number>();
    for (const [term, count] of df) {
      this.idf.set(term, Math.log((n + 1) / (count + 1)) + 1);
    }
    this.maxIdf = Math.log(n + 1) + 1;
  }

  private tfidf(bag: Bag): Bag {
    const out: Bag = new Map();
    for (const [term, tf] of bag) out.set(term, tf * (this.idf.get(term) ?? this.maxIdf));
    return out;
  }

  private cosineSimilarity(a: Bag, b: Bag): number {
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

  inferFromText(text: string, k = 5): TextInference {
    const query = this.tfidf(bagOf(text));
    if (query.size === 0) return { vector: zeroVector(), neighbors: [], confidence: 0 };

    const scored = this.corpus
      .map(({ bag, ex }) => ({ ex, similarity: this.cosineSimilarity(query, this.tfidf(bag)) }))
      .filter((s) => s.similarity > 0.01)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k);

    if (scored.length === 0) return { vector: zeroVector(), neighbors: [], confidence: 0 };

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

    const best = scored[0]!.similarity;
    const confidence = Math.min(1, best * (0.6 + 0.4 * (scored.length / k)));

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
    };
  }
}
