import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/auth";
import { db, isDbConfigured } from "@/lib/db";
import { learnFromFeedback, sanitizeWeights, defaultWeights } from "@/lib/ml/recommend";
import { loadWeights, saveWeights, invalidateWeightsCache } from "@/lib/ml/weights-store";
import { CAMPAIGN_PROFILES, DIMENSIONS, type Vector } from "@/data/ml-simulation-dataset";

/**
 * Ajuste del modelo por parte del Master. Protegido: sólo admin.
 *
 * Dos modos:
 *  - "correction": el Master dice "a esta persona le correspondía X, no Y" y el
 *    motor mueve los pesos en esa dirección (aprendizaje incremental).
 *  - "manual": el Master fija los pesos a mano desde el panel.
 *
 * GET devuelve los pesos actuales y el historial de correcciones.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAMPAIGN_IDS = CAMPAIGN_PROFILES.map((c) => c.id) as [string, ...string[]];

const VectorSchema = z.object(
  Object.fromEntries(DIMENSIONS.map((d) => [d, z.number().min(0).max(1)])) as Record<
    (typeof DIMENSIONS)[number],
    z.ZodNumber
  >,
);

const Schema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("correction"),
    vector: VectorSchema,
    predicted: z.enum(CAMPAIGN_IDS),
    actual: z.enum(CAMPAIGN_IDS),
    /** Cuánto mover por corrección. Chico por defecto a propósito. */
    rate: z.number().min(0.01).max(0.5).default(0.08),
  }),
  z.object({
    mode: z.literal("manual"),
    weights: z.record(z.string(), z.number()),
    note: z.string().max(200).optional(),
  }),
  z.object({
    mode: z.literal("reset"),
  }),
]);

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const weights = await loadWeights();

  let history: unknown[] = [];
  if (isDbConfigured()) {
    try {
      const sql = db();
      history = await sql`
        select id, predicted, actual, created_at
        from ml_feedback
        order by created_at desc
        limit 50
      `;
    } catch (err) {
      console.error("[ml/feedback] GET historial:", err);
    }
  }

  return NextResponse.json({
    weights,
    dimensions: DIMENSIONS,
    campaigns: CAMPAIGN_PROFILES.map((c) => ({ id: c.id, name: c.name })),
    history,
    persisted: isDbConfigured(),
  });
}

export async function POST(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // --- Reset ---
  if (data.mode === "reset") {
    const w = defaultWeights();
    await saveWeights(w, "reset manual");
    invalidateWeightsCache();
    return NextResponse.json({ ok: true, weights: w });
  }

  // --- Ajuste manual ---
  if (data.mode === "manual") {
    const w = sanitizeWeights(data.weights);
    const saved = await saveWeights(w, data.note ?? "ajuste manual");
    invalidateWeightsCache();
    return NextResponse.json({ ok: true, weights: w, persisted: saved });
  }

  // --- Corrección con aprendizaje ---
  const current = await loadWeights();
  const next = learnFromFeedback(
    current,
    { vector: data.vector as Vector, predicted: data.predicted, actual: data.actual },
    data.rate,
  );

  const saved = await saveWeights(next, `corrección: ${data.predicted} → ${data.actual}`);
  invalidateWeightsCache();

  // Guardamos la corrección para poder auditar cómo se movió el modelo.
  if (isDbConfigured()) {
    try {
      const sql = db();
      await sql`
        insert into ml_feedback (vector, predicted, actual, weights_after)
        values (
          ${JSON.stringify(data.vector)}::jsonb,
          ${data.predicted},
          ${data.actual},
          ${JSON.stringify(next)}::jsonb
        )
      `;
    } catch (err) {
      console.error("[ml/feedback] no se pudo registrar la corrección:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    weights: next,
    previous: current,
    persisted: saved,
  });
}
