import { Injectable } from "@angular/core";
import { normalize } from "./ml-vectorize.service";
import type { TreeNode, TreeOption } from "./tree-store.service";

/**
 * Resuelve un turno de la Encrucijada CONTRA EL CLIENTE, con el árbol ya
 * combinado que trajo TreeStoreService. Es el equivalente al motor TS de
 * fallback de la versión Next.js (lib/ai/tree-fallback.ts): TF-IDF simple +
 * coseno sobre las keywords de cada opción. No hace falta ida y vuelta al
 * servidor por cada tirada de texto libre — el árbol ya está en memoria del
 * navegador tras el primer fetch.
 */

const MIN_SIMILARITY = 0.12;

function bagOf(text: string): Map<string, number> {
  const bag = new Map<string, number>();
  for (const t of normalize(text).split(" ").filter((w) => w.length > 1)) {
    bag.set(t, (bag.get(t) ?? 0) + 1);
  }
  return bag;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
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

export type TreeTurnResult = {
  matched: boolean;
  similarity: number;
  option?: TreeOption;
  nextNode?: TreeNode;
  message?: string;
};

@Injectable({ providedIn: "root" })
export class TreeEngineService {
  resolveTurn(node: TreeNode, nodes: Record<string, TreeNode>, playerText: string): TreeTurnResult {
    const options = node.options ?? [];
    if (options.length === 0) return { matched: false, similarity: 0, message: "Este nodo no tiene más opciones." };

    const query = bagOf(playerText);
    let best: TreeOption | null = null;
    let bestSim = 0;

    for (const opt of options) {
      const doc = [opt.label, ...opt.keywords, ...opt.keywords].join(" ");
      const sim = cosine(query, bagOf(doc));
      if (sim > bestSim) {
        bestSim = sim;
        best = opt;
      }
    }

    if (!best || bestSim < MIN_SIMILARITY) {
      return {
        matched: false,
        similarity: Number(bestSim.toFixed(4)),
        message: "No reconocí bien esa acción. Probá describirla con otras palabras.",
      };
    }

    return {
      matched: true,
      similarity: Number(bestSim.toFixed(4)),
      option: best,
      nextNode: nodes[best.next],
    };
  }

  classifyArchetype(
    accumulated: Record<string, number>,
    archetypes: Record<string, { tagline: string; description: string; suggested_class: string; master_tip: string }>,
  ) {
    const entries = Object.entries(accumulated);
    if (entries.length === 0) return { id: null as string | null, info: null, scores: {} as Record<string, number> };

    const total = entries.reduce((acc, [, v]) => acc + v, 0) || 1;
    const scores: Record<string, number> = {};
    for (const [k, v] of entries) scores[k] = Number((v / total).toFixed(4));

    const topId = entries.reduce((a, b) => (scores[a[0]]! >= scores[b[0]]! ? a : b))[0];
    return { id: topId, info: archetypes[topId] ?? null, scores };
  }
}
