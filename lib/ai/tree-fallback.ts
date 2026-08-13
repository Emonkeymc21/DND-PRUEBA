import treeData from "@/data/role_tree_dataset.json";
import { normalize } from "@/lib/ai/heuristic";

/**
 * Motor TypeScript equivalente al de ml_service/ml_engine.py.
 *
 * Implementa la MISMA lógica (TF-IDF simplificado + coseno sobre las
 * keywords de cada opción) para que el resultado sea consistente entre el
 * servicio Python (dev) y este fallback (siempre disponible, incluido
 * producción serverless donde Python no corre).
 *
 * No es una reescritura "aproximada": usa el mismo dataset
 * (role_tree_dataset.json) y el mismo umbral de similitud, así que un mismo
 * texto da la misma decisión navegue por el camino que navegue.
 */

type ArchetypeWeights = Record<string, number>;

type TreeOption = {
  id: string;
  label: string;
  keywords: string[];
  archetype_weight: ArchetypeWeights;
  next: string;
  consequence: string;
};

type TreeNode = {
  id: string;
  title: string;
  text: string;
  end?: boolean;
  archetype_result?: string;
  options: TreeOption[];
};

type TreeDataset = {
  root_node: string;
  nodes: Record<string, TreeNode>;
  archetypes: Record<
    string,
    { tagline: string; description: string; suggested_class: string; master_tip: string }
  >;
};

const DATA = treeData as unknown as TreeDataset;

const MIN_SIMILARITY = 0.12;

/** Bolsa de palabras simple: cuenta ocurrencias tras normalizar y tokenizar. */
function bagOf(text: string): Map<string, number> {
  const bag = new Map<string, number>();
  const tokens = normalize(text)
    .split(" ")
    .filter((w) => w.length > 1);

  for (const t of tokens) bag.set(t, (bag.get(t) ?? 0) + 1);
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

export function getNode(nodeId: string): TreeNode | null {
  return DATA.nodes[nodeId] ?? null;
}

export type TreeTurnResult = {
  ok: boolean;
  matched: boolean;
  similarity: number;
  chosenOption?: string;
  consequence?: string;
  nextNode?: {
    id: string;
    title: string;
    text: string;
    end: boolean;
    archetypeResult: string | null;
    options: Array<{ id: string; label: string }>;
  } | null;
  archetypeWeight?: ArchetypeWeights;
  message?: string;
  availableOptions?: string[];
  error?: string;
};

export function resolveTreeTurn(nodeId: string, playerText: string): TreeTurnResult {
  const node = getNode(nodeId);
  if (!node) {
    return { ok: false, matched: false, similarity: 0, error: `Nodo '${nodeId}' no existe.` };
  }

  const options = node.options ?? [];
  if (options.length === 0) {
    return { ok: true, matched: false, similarity: 0, message: "Este nodo no tiene más opciones." };
  }

  const query = bagOf(playerText);

  let best: TreeOption | null = null;
  let bestSim = 0;

  for (const opt of options) {
    // Mismo documento que arma el lado Python: label + keywords duplicadas
    // (para que pesen más en la bolsa de palabras).
    const doc = [opt.label, ...opt.keywords, ...opt.keywords].join(" ");
    const sim = cosine(query, bagOf(doc));
    if (sim > bestSim) {
      bestSim = sim;
      best = opt;
    }
  }

  if (!best || bestSim < MIN_SIMILARITY) {
    return {
      ok: true,
      matched: false,
      similarity: Number(bestSim.toFixed(4)),
      message: "No reconocí bien esa acción. Probá describirla con otras palabras.",
      availableOptions: options.map((o) => o.label),
    };
  }

  const nextNode = getNode(best.next);

  return {
    ok: true,
    matched: true,
    similarity: Number(bestSim.toFixed(4)),
    chosenOption: best.id,
    consequence: best.consequence,
    archetypeWeight: best.archetype_weight,
    nextNode: nextNode
      ? {
          id: nextNode.id,
          title: nextNode.title,
          text: nextNode.text,
          end: !!nextNode.end,
          archetypeResult: nextNode.archetype_result ?? null,
          options: (nextNode.options ?? []).map((o) => ({ id: o.id, label: o.label })),
        }
      : null,
  };
}

export function classifyArchetype(accumulated: ArchetypeWeights): {
  id: string | null;
  info: (typeof DATA.archetypes)[string] | null;
  scores: ArchetypeWeights;
} {
  const entries = Object.entries(accumulated);
  if (entries.length === 0) return { id: null, info: null, scores: {} };

  const total = entries.reduce((acc, [, v]) => acc + v, 0) || 1;
  const scores: ArchetypeWeights = {};
  for (const [k, v] of entries) scores[k] = Number((v / total).toFixed(4));

  const topId = entries.reduce((a, b) => (scores[a[0]]! >= scores[b[0]]! ? a : b))[0];

  return { id: topId, info: DATA.archetypes[topId] ?? null, scores };
}

export const ROOT_NODE_ID = DATA.root_node;
