import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/auth";
import {
  getMergedTree,
  upsertNode,
  deleteOverlayNode,
  listOverlayNodeIds,
  treePersistenceAvailable,
  BASE_NODE_IDS,
} from "@/lib/ml/tree-store";

/**
 * Gestión del árbol narrativo desde /admin/arbol.
 *
 * GET  → dataset combinado (base + lo que agregó el Master) + qué IDs son
 *        propios del Master (para poder distinguirlos y permitir borrarlos).
 * POST → crea o edita un nodo.
 * DELETE (?id=) → borra un nodo agregado por el Master. Los nodos base
 *        (los del JSON original) no se pueden borrar desde acá.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OptionSchema = z.object({
  id: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  keywords: z.array(z.string().trim().min(1).max(60)).min(1).max(20),
  archetype_weight: z.record(z.string(), z.number().min(-1).max(1)).default({}),
  next: z.string().trim().min(1).max(60),
  consequence: z.string().trim().min(1).max(300),
});

const NodeSchema = z.object({
  id: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(160),
  text: z.string().trim().min(1).max(1000),
  end: z.boolean().default(false),
  archetype_result: z.string().trim().max(60).optional(),
  options: z.array(OptionSchema).max(15).default([]),
});

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const dataset = await getMergedTree();
  const overlayIds = await listOverlayNodeIds();

  return NextResponse.json({
    rootNode: dataset.root_node,
    nodes: dataset.nodes,
    archetypes: dataset.archetypes,
    baseNodeIds: BASE_NODE_IDS,
    overlayNodeIds: overlayIds,
    persisted: treePersistenceAvailable(),
  });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = NodeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos de nodo inválidos." },
      { status: 400 },
    );
  }

  const saved = await upsertNode(parsed.data);

  return NextResponse.json({ ok: true, persisted: saved });
}

export async function DELETE(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el id del nodo." }, { status: 400 });

  if (BASE_NODE_IDS.includes(id)) {
    return NextResponse.json(
      { error: "Ese nodo es parte del dataset base y no se puede borrar desde acá." },
      { status: 400 },
    );
  }

  const ok = await deleteOverlayNode(id);
  return NextResponse.json({ ok });
}
