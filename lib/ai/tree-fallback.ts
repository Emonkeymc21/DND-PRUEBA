import { normalize } from "@/lib/ai/heuristic";
import { getMergedTree, type TreeNode, type TreeOption } from "@/lib/ml/tree-store";

/**
 * Motor TypeScript equivalente al de ml_service/ml_engine.py.
 *
 * Misma lógica (bolsa de palabras + similitud coseno sobre las keywords de
 * cada opción), pero resuelve contra el dataset COMBINADO (base +
 * agregados del Master vía /admin/arbol), no contra el JSON estático solo.
 * Esto es lo que corre siempre en producción — el servicio Python es sólo
 * un acelerador de desarrollo que lee el JSON estático sin overlay.
 */

const MIN_SIMILARITY = 0.12;

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

function matchOption(node: TreeNode, playerText: string): { option: TreeOption | null; similarity: number } {
  const options = node.options ?? [];
  if (options.length === 0) return { option: null, similarity: 0 };

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

  if (!best || bestSim < MIN_SIMILARITY) return { option: null, similarity: bestSim };
  return { option: best, similarity: bestSim };
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
  archetypeWeight?: Record<string, number>;
  message?: string;
  availableOptions?: string[];
  error?: string;
};

export async function resolveTreeTurn(nodeId: string, playerText: string): Promise<TreeTurnResult> {
  const dataset = await getMergedTree();
  const node = dataset.nodes[nodeId];

  if (!node) {
    return { ok: false, matched: false, similarity: 0, error: `Nodo '${nodeId}' no existe.` };
  }

  const options = node.options ?? [];
  if (options.length === 0) {
    return { ok: true, matched: false, similarity: 0, message: "Este nodo no tiene más opciones." };
  }

  const { option: best, similarity: bestSim } = matchOption(node, playerText);

  if (!best) {
    return {
      ok: true,
      matched: false,
      similarity: Number(bestSim.toFixed(4)),
      message: "No reconocí bien esa acción. Probá describirla con otras palabras.",
      availableOptions: options.map((o) => o.label),
    };
  }

  const nextNode = dataset.nodes[best.next];

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

export async function classifyArchetype(accumulated: Record<string, number>): Promise<{
  id: string | null;
  info: { tagline: string; description: string; suggested_class: string; master_tip: string } | null;
  scores: Record<string, number>;
}> {
  const entries = Object.entries(accumulated);
  if (entries.length === 0) return { id: null, info: null, scores: {} };

  const dataset = await getMergedTree();
  const total = entries.reduce((acc, [, v]) => acc + v, 0) || 1;
  const scores: Record<string, number> = {};
  for (const [k, v] of entries) scores[k] = Number((v / total).toFixed(4));

  const topId = entries.reduce((a, b) => (scores[a[0]]! >= scores[b[0]]! ? a : b))[0];

  return { id: topId, info: dataset.archetypes[topId] ?? null, scores };
}

export async function getRootNodeId(): Promise<string> {
  const dataset = await getMergedTree();
  return dataset.root_node;
}
