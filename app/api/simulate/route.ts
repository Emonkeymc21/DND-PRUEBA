import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveTreeTurn, classifyArchetype } from "@/lib/ai/tree-fallback";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Endpoint del árbol narrativo.
 *
 * Intenta el servicio Python local (ml_service/, puerto 8000) primero. Si no
 * responde en 1.5s, si no está corriendo, o si devuelve algo inesperado, cae
 * al motor TypeScript (lib/ai/tree-fallback.ts) — misma forma de respuesta en
 * los dos casos, sin que el jugador note el cambio.
 *
 * En producción (Vercel) el fetch a localhost:8000 falla de inmediato (nada
 * escucha ahí) y se usa el fallback siempre. Es intencional: el motor Python
 * es una comodidad de desarrollo, nunca una dependencia de producción. El
 * fallback TS además resuelve contra el árbol combinado (base + nodos que
 * agregó el Master desde /admin/arbol); el servicio Python sólo ve el JSON
 * estático.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PYTHON_SERVICE_URL = process.env.ML_SERVICE_URL ?? "http://localhost:8000";
const PYTHON_TIMEOUT_MS = 1500;

const Schema = z.object({
  nodeId: z.string().min(1).max(60).default("root"),
  text: z.string().trim().min(1, "Escribí algo.").max(400),
  accumulatedWeights: z.record(z.string(), z.number()).default({}),
});

type PythonTurnResponse = {
  ok: boolean;
  matched: boolean;
  similarity: number;
  chosen_option?: string;
  consequence?: string;
  next_node?: {
    id: string;
    title: string | null;
    text: string | null;
    end: boolean;
    archetype_result: string | null;
    options: Array<{ id: string; label: string }>;
  } | null;
  accumulated_weights: Record<string, number>;
  archetype?: { id: string | null; info: unknown; scores: Record<string, number> } | null;
  message?: string;
  available_options?: string[];
};

function fromPython(data: PythonTurnResponse) {
  return {
    ok: data.ok,
    matched: data.matched,
    similarity: data.similarity,
    chosenOption: data.chosen_option ?? null,
    consequence: data.consequence ?? null,
    nextNode: data.next_node
      ? {
          id: data.next_node.id,
          title: data.next_node.title ?? "",
          text: data.next_node.text ?? "",
          end: data.next_node.end,
          archetypeResult: data.next_node.archetype_result,
          options: data.next_node.options,
        }
      : null,
    accumulatedWeights: data.accumulated_weights,
    archetype: data.archetype ?? null,
    message: data.message ?? null,
    availableOptions: data.available_options ?? [],
    engine: "python" as const,
  };
}

async function tryPython(nodeId: string, text: string, accumulatedWeights: Record<string, number>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PYTHON_TIMEOUT_MS);

  try {
    const res = await fetch(`${PYTHON_SERVICE_URL}/simulate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ node_id: nodeId, text, accumulated_weights: accumulatedWeights }),
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const data = (await res.json()) as PythonTurnResponse;
    return fromPython(data);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function useFallback(nodeId: string, text: string, accumulatedWeights: Record<string, number>) {
  const result = await resolveTreeTurn(nodeId, text);

  if (!result.ok) {
    return { ok: false, error: result.error, engine: "typescript" as const };
  }

  if (!result.matched) {
    return {
      ok: true,
      matched: false,
      similarity: result.similarity,
      accumulatedWeights,
      message: result.message,
      availableOptions: result.availableOptions ?? [],
      engine: "typescript" as const,
    };
  }

  const newWeights = { ...accumulatedWeights };
  for (const [k, v] of Object.entries(result.archetypeWeight ?? {})) {
    newWeights[k] = (newWeights[k] ?? 0) + v;
  }

  const archetype = await classifyArchetype(newWeights);

  return {
    ok: true,
    matched: true,
    similarity: result.similarity,
    chosenOption: result.chosenOption,
    consequence: result.consequence,
    nextNode: result.nextNode,
    accumulatedWeights: newWeights,
    archetype,
    engine: "typescript" as const,
  };
}

export async function POST(req: Request) {
  if (!rateLimit(`simulate:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ ok: false, error: "Demasiadas peticiones seguidas." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const { nodeId, text, accumulatedWeights } = parsed.data;

  const pythonResult = await tryPython(nodeId, text, accumulatedWeights);
  if (pythonResult) {
    return NextResponse.json(pythonResult);
  }

  const fallbackResult = await useFallback(nodeId, text, accumulatedWeights);
  return NextResponse.json(fallbackResult);
}

export async function GET() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PYTHON_TIMEOUT_MS);

  try {
    const res = await fetch(`${PYTHON_SERVICE_URL}/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ engine: "python", detail: data });
    }
  } catch {
    clearTimeout(timer);
  }

  return NextResponse.json({ engine: "typescript", detail: "Servicio Python no disponible." });
}
