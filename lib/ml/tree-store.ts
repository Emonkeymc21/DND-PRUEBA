import { kvGet, kvSet, isKvConfigured } from "@/lib/kv";
import baseTreeData from "@/data/role_tree_dataset.json";

/**
 * Nodos que el Master agrega desde /admin/arbol.
 *
 * El dataset base (data/role_tree_dataset.json) es un archivo estático: en
 * Vercel el sistema de archivos del deploy es de sólo lectura, así que no se
 * puede escribir ahí en runtime. Los nodos que el Master crea se guardan
 * aparte (Upstash si está configurado, memoria del proceso si no) y se
 * combinan con el dataset base al leer — el archivo original nunca se toca.
 *
 * IMPORTANTE: estos nodos los ve el motor TypeScript (lib/ai/tree-fallback.ts),
 * que es el que corre siempre en producción. El servicio Python de desarrollo
 * (ml_service/) lee directo el JSON estático y no ve las adiciones del panel;
 * es una limitación conocida y aceptable, dado que Python ahí es sólo un
 * acelerador de desarrollo, nunca la fuente de verdad en producción.
 */

export type TreeOption = {
  id: string;
  label: string;
  keywords: string[];
  archetype_weight: Record<string, number>;
  next: string;
  consequence: string;
};

export type TreeNode = {
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

const BASE = baseTreeData as unknown as TreeDataset;
const OVERLAY_KEY = "mesa:tree:overlay";

let memoryOverlay: Record<string, TreeNode> = {};

async function loadOverlay(): Promise<Record<string, TreeNode>> {
  if (!isKvConfigured()) return memoryOverlay;
  const stored = await kvGet<Record<string, TreeNode>>(OVERLAY_KEY);
  return stored ?? {};
}

async function saveOverlay(overlay: Record<string, TreeNode>): Promise<boolean> {
  memoryOverlay = overlay;
  if (!isKvConfigured()) return true; // se guardó en memoria, que es lo mejor disponible
  return kvSet(OVERLAY_KEY, overlay);
}

/** Dataset completo: base + lo que agregó el Master, con el overlay ganando en caso de choque de IDs. */
export async function getMergedTree(): Promise<TreeDataset> {
  const overlay = await loadOverlay();
  return {
    root_node: BASE.root_node,
    archetypes: BASE.archetypes,
    nodes: { ...BASE.nodes, ...overlay },
  };
}

export async function upsertNode(node: TreeNode): Promise<boolean> {
  const overlay = await loadOverlay();
  overlay[node.id] = node;
  return saveOverlay(overlay);
}

export async function deleteOverlayNode(nodeId: string): Promise<boolean> {
  const overlay = await loadOverlay();
  if (!(nodeId in overlay)) return true;
  delete overlay[nodeId];
  return saveOverlay(overlay);
}

export async function listOverlayNodeIds(): Promise<string[]> {
  const overlay = await loadOverlay();
  return Object.keys(overlay);
}

export function treePersistenceAvailable(): boolean {
  return isKvConfigured();
}

export const BASE_NODE_IDS = Object.keys(BASE.nodes);
