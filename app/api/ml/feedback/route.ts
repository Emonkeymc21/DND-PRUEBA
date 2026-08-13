import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/auth";
import { kvPushCapped, kvList } from "@/lib/kv";
import { learnFromFeedback, sanitizeWeights, defaultWeights } from "@/lib/ml/recommend";
import { loadWeights, saveWeights, invalidateWeightsCache, weightsPersistenceAvailable } from "@/lib/ml/weights-store";
import { CAMPAIGN_PROFILES, DIMENSIONS, type Vector } from "@/data/ml-simulation-dataset";

/**
 * Ajuste del modelo por parte del Master. Protegido: sólo admin.
 *
 * Dos modos:
 *  - "correction": el Master dice "a esta persona le correspondía X, no Y" y el
 *    motor mueve los pesos en esa dirección (aprendizaje incremental).
 *  - "manual": el Master fija los pesos a mano desde el panel.
 *
 * GET devuelve los pesos actuales y el historial de correcciones. Todo vive
 * en Upstash Redis (lib/kv.ts) en vez de Postgres; sin Upstash configurado,
 * los pesos funcionan igual en memoria del proceso y el historial queda vacío.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEEDBACK_KEY = "mesa:ml:feedback";

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

type FeedbackHistoryRow = {
  predicted: string;
  actual: string;
  createdAt: string;
};

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const weights = await loadWeights();
  const history = await kvList<FeedbackHistoryRow>(FEEDBACK_KEY, 50);

  return NextResponse.json({
    weights,
    dimensions: DIMENSIONS,
    campaigns: CAMPAIGN_PROFILES.map((c) => ({ id: c.id, name: c.name })),
    history,
    persisted: weightsPersistenceAvailable(),
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

  if (data.mode === "reset") {
    const w = defaultWeights();
    await saveWeights(w);
    invalidateWeightsCache();
    return NextResponse.json({ ok: true, weights: w });
  }

  if (data.mode === "manual") {
    const w = sanitizeWeights(data.weights);
    const saved = await saveWeights(w);
    invalidateWeightsCache();
    return NextResponse.json({ ok: true, weights: w, persisted: saved });
  }

  const current = await loadWeights();
  const next = learnFromFeedback(
    current,
    { vector: data.vector as Vector, predicted: data.predicted, actual: data.actual },
    data.rate,
  );

  const saved = await saveWeights(next);
  invalidateWeightsCache();

  await kvPushCapped(
    FEEDBACK_KEY,
    { predicted: data.predicted, actual: data.actual, createdAt: new Date().toISOString() } satisfies FeedbackHistoryRow,
    50,
  );

  return NextResponse.json({
    ok: true,
    weights: next,
    previous: current,
    persisted: saved,
  });
}
