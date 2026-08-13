import { NextResponse } from "next/server";
import { z } from "zod";
import { inferFromText } from "@/lib/ml/vectorize";
import {
  blendVectors,
  classifyArchetype,
  recommendCampaigns,
  toFormFields,
} from "@/lib/ml/recommend";
import { loadWeights } from "@/lib/ml/weights-store";
import { DIMENSIONS, LINEA_ROJA_VALUES, EXPERIENCIA_VALUES, zeroVector, type Vector } from "@/data/ml-simulation-dataset";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Clasificación e inferencia del perfil.
 *
 * Recibe el texto libre del turno (opcional) y el historial de vectores, y
 * devuelve: vector actualizado, arquetipo, ranking de campañas y los campos del
 * formulario que se pueden precompletar.
 *
 * Corre en Node y no en Edge porque `loadWeights` toca Postgres.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VectorSchema = z.object(
  Object.fromEntries(DIMENSIONS.map((d) => [d, z.number().min(0).max(1)])) as Record<
    (typeof DIMENSIONS)[number],
    z.ZodNumber
  >,
);

const Schema = z.object({
  text: z.string().trim().max(400).optional(),
  /** Vectores de los turnos anteriores. */
  history: z.array(VectorSchema).max(30).default([]),
  experiencia: z.enum(EXPERIENCIA_VALUES).nullish(),
  lineasRojas: z.array(z.enum(LINEA_ROJA_VALUES)).max(10).default([]),
});

export async function POST(req: Request) {
  if (!rateLimit(`ml:${clientIp(req)}`, 40, 60_000)) {
    return NextResponse.json({ error: "Demasiadas peticiones seguidas." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const { text, history, experiencia, lineasRojas } = parsed.data;

  // 1. El texto de este turno, si lo hay, se vuelve un vector.
  const inference = text && text.length > 1 ? inferFromText(text) : null;

  // 2. Se acumula con el historial (los turnos recientes pesan más).
  const allVectors: Vector[] = [...(history as Vector[])];
  if (inference) allVectors.push(inference.vector);

  const profile = allVectors.length > 0 ? blendVectors(allVectors) : zeroVector();

  // 3. Pesos actuales (pueden venir ajustados por el Master).
  const weights = await loadWeights();

  // 4. Arquetipo y campañas.
  const archetypes = classifyArchetype(profile, weights);
  const campaigns = recommendCampaigns(profile, weights, {
    experiencia: experiencia ?? null,
    lineasRojas: lineasRojas ?? [],
  });

  const topCampaign = campaigns.find((c) => !c.blocked) ?? null;

  return NextResponse.json({
    /** Vector de ESTE turno (para que el cliente lo agregue al historial). */
    turnVector: inference?.vector ?? null,
    /** Perfil acumulado. */
    profile,
    confidence: inference?.confidence ?? null,
    /** Los vecinos más cercanos: hacen la predicción explicable. */
    neighbors: inference?.neighbors ?? [],
    archetype: archetypes[0]
      ? {
          id: archetypes[0].archetype.id,
          name: archetypes[0].archetype.name,
          tagline: archetypes[0].archetype.tagline,
          description: archetypes[0].archetype.description,
          suggestedClass: archetypes[0].archetype.suggestedClass,
          masterTip: archetypes[0].archetype.masterTip,
          score: archetypes[0].score,
        }
      : null,
    archetypeRanking: archetypes.slice(0, 3).map((a) => ({
      id: a.archetype.id,
      name: a.archetype.name,
      score: a.score,
    })),
    campaigns: campaigns.slice(0, 4).map((c) => ({
      id: c.campaign.id,
      name: c.campaign.name,
      pitch: c.campaign.pitch,
      sistema: c.campaign.sistema,
      tematica: c.campaign.tematica,
      frecuencia: c.campaign.frecuencia,
      score: c.score,
      reasons: c.reasons,
      blocked: c.blocked,
    })),
    /** Campos del formulario que se pueden precompletar. */
    inferredFields: topCampaign ? toFormFields(topCampaign.campaign) : null,
  });
}
