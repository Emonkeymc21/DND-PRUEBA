import { Injectable } from "@angular/core";
import {
  ARCHETYPES,
  CAMPAIGN_PROFILES,
  DIMENSIONS,
  type Archetype,
  type CampaignProfile,
  type Dimension,
  type Vector,
  type LineaRojaValue,
  type ExperienciaValue,
} from "../data/ml-simulation-dataset";

export type Weights = Record<Dimension, number>;

export function defaultWeights(): Weights {
  return { combate: 1, creatividad: 1, equipo: 1, ley: 1, riesgo: 1, oscuridad: 1, regla: 1, humor: 1 };
}

export function sanitizeWeights(raw: unknown): Weights {
  const base = defaultWeights();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Record<string, unknown>;
  for (const dim of DIMENSIONS) {
    const v = src[dim];
    if (typeof v === "number" && Number.isFinite(v)) base[dim] = Math.min(3, Math.max(0, v));
  }
  return base;
}

export type ArchetypeMatch = { archetype: Archetype; score: number };
export type CampaignMatch = {
  campaign: CampaignProfile;
  score: number;
  rawScore: number;
  reasons: string[];
  blocked: boolean;
};

export const DIMENSION_LABEL: Record<Dimension, string> = {
  combate: "preferencia de combate",
  creatividad: "creatividad",
  equipo: "juego en equipo",
  ley: "respeto por las reglas",
  riesgo: "tolerancia al riesgo",
  oscuridad: "tono oscuro",
  regla: "gusto por la mecánica",
  humor: "humor",
};

/**
 * Recomendador por similitud coseno ponderada. Puerto directo de
 * lib/ml/recommend.ts. Sin estado propio más allá de lo que ya es constante
 * (ARCHETYPES/CAMPAIGN_PROFILES), así que no necesita guardar nada en el
 * constructor — los pesos los maneja WeightsService, no este servicio.
 */
@Injectable({ providedIn: "root" })
export class MlRecommendService {
  weightedCosine(a: Vector, b: Vector, w: Weights): number {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (const dim of DIMENSIONS) {
      const weight = w[dim];
      if (weight === 0) continue;
      const av = (a[dim] - 0.5) * weight;
      const bv = (b[dim] - 0.5) * weight;
      dot += av * bv;
      na += av * av;
      nb += bv * bv;
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    if (denom === 0) return 0;
    return (dot / denom + 1) / 2;
  }

  classifyArchetype(v: Vector, w: Weights = defaultWeights()): ArchetypeMatch[] {
    return ARCHETYPES.map((archetype) => ({
      archetype,
      score: Number(this.weightedCosine(v, archetype.vector, w).toFixed(4)),
    })).sort((a, b) => b.score - a.score);
  }

  recommendCampaigns(
    v: Vector,
    w: Weights = defaultWeights(),
    ctx: { experiencia?: ExperienciaValue | null; lineasRojas?: LineaRojaValue[] } = {},
  ): CampaignMatch[] {
    const rojas = new Set(ctx.lineasRojas ?? []);

    const matches = CAMPAIGN_PROFILES.map((campaign) => {
      const rawScore = this.weightedCosine(v, campaign.vector, w);
      let score = rawScore;
      const reasons: string[] = [];

      const choque = campaign.contenido.filter((c) => rojas.has(c));
      if (choque.length > 0) {
        return {
          campaign,
          score: 0,
          rawScore: Number(rawScore.toFixed(4)),
          reasons: ["Descartada: incluye contenido que marcaste como límite."],
          blocked: true,
        };
      }

      if (ctx.experiencia) {
        if (campaign.experiencia.includes(ctx.experiencia)) {
          score *= 1.15;
          reasons.push("Pensada para tu nivel de experiencia.");
        } else {
          score *= 0.75;
          reasons.push("Apuntada a otro nivel de experiencia.");
        }
      }

      const cercanas = DIMENSIONS.map((dim) => ({
        dim,
        dist: Math.abs(v[dim] - campaign.vector[dim]) / (w[dim] || 1),
      }))
        .filter((d) => w[d.dim] > 0)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 2);

      for (const c of cercanas) {
        if (c.dist < 0.2) reasons.push(`Calza en ${DIMENSION_LABEL[c.dim]}.`);
      }

      return {
        campaign,
        score: Number(Math.min(1, score).toFixed(4)),
        rawScore: Number(rawScore.toFixed(4)),
        reasons,
        blocked: false,
      };
    });

    return matches.sort((a, b) => b.score - a.score);
  }

  learnFromFeedback(
    current: Weights,
    fb: { vector: Vector; predicted: string; actual: string },
    rate = 0.08,
  ): Weights {
    if (fb.predicted === fb.actual) return current;

    const predicted = CAMPAIGN_PROFILES.find((c) => c.id === fb.predicted);
    const actual = CAMPAIGN_PROFILES.find((c) => c.id === fb.actual);
    if (!predicted || !actual) return current;

    const next: Weights = { ...current };
    for (const dim of DIMENSIONS) {
      const distToActual = Math.abs(fb.vector[dim] - actual.vector[dim]);
      const distToPredicted = Math.abs(fb.vector[dim] - predicted.vector[dim]);
      const signal = distToPredicted - distToActual;
      next[dim] = Math.min(3, Math.max(0, next[dim] + signal * rate * 2));
    }

    const sum = DIMENSIONS.reduce((acc, d) => acc + next[d], 0);
    const target = DIMENSIONS.length;
    if (sum > 0) {
      for (const dim of DIMENSIONS) next[dim] = Number(((next[dim] * target) / sum).toFixed(4));
    }
    return next;
  }

  toFormFields(top: CampaignProfile) {
    return { sistema: top.sistema, tematica: top.tematica, frecuencia: top.frecuencia };
  }

  blendVectors(history: Vector[]): Vector {
    const out: Vector = { combate: 0, creatividad: 0, equipo: 0, ley: 0, riesgo: 0, oscuridad: 0, regla: 0, humor: 0 };
    if (history.length === 0) return { combate: 0.5, creatividad: 0.5, equipo: 0.5, ley: 0.5, riesgo: 0.5, oscuridad: 0.5, regla: 0.5, humor: 0.5 };

    let totalWeight = 0;
    history.forEach((v, i) => {
      const weight = 1 + i * 0.25;
      totalWeight += weight;
      for (const dim of DIMENSIONS) out[dim] += v[dim] * weight;
    });

    for (const dim of DIMENSIONS) out[dim] = Number((out[dim] / totalWeight).toFixed(4));
    return out;
  }
}
