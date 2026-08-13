import {
  ARCHETYPES,
  CAMPAIGN_PROFILES,
  DIMENSIONS,
  zeroVector,
  type Archetype,
  type CampaignProfile,
  type Dimension,
  type Vector,
  type LineaRojaValue,
  type ExperienciaValue,
} from "@/data/ml-simulation-dataset";

/**
 * Recomendador por similitud coseno con pesos por dimensión.
 *
 * Los pesos son el punto clave del pedido: el Master puede decir "para mi mesa
 * importa mucho más el eje oscuridad que el humor" y el ranking cambia sin
 * tocar código. Además el motor aprende de las correcciones (ver
 * `learnFromFeedback`).
 */

export type Weights = Record<Dimension, number>;

/** Todas las dimensiones pesan igual hasta que alguien diga lo contrario. */
export function defaultWeights(): Weights {
  return {
    combate: 1,
    creatividad: 1,
    equipo: 1,
    ley: 1,
    riesgo: 1,
    oscuridad: 1,
    regla: 1,
    humor: 1,
  };
}

/** Limita los pesos a un rango sano: 0 apaga la dimensión, 3 la triplica. */
export function sanitizeWeights(raw: unknown): Weights {
  const base = defaultWeights();
  if (!raw || typeof raw !== "object") return base;

  const src = raw as Record<string, unknown>;
  for (const dim of DIMENSIONS) {
    const v = src[dim];
    if (typeof v === "number" && Number.isFinite(v)) {
      base[dim] = Math.min(3, Math.max(0, v));
    }
  }
  return base;
}

// ---------------------------------------------------------------------------
// Similitud ponderada
// ---------------------------------------------------------------------------

/**
 * Coseno ponderado entre dos vectores densos de 8 dimensiones.
 *
 * Los vectores se centran en 0 restando 0.5 antes de comparar. Sin centrar,
 * dos perfiles neutros (todo 0.5) darían similitud 1.0 con absolutamente todo,
 * porque el coseno mira ángulos y no distancias.
 */
export function weightedCosine(a: Vector, b: Vector, w: Weights): number {
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

  // Coseno va de -1 a 1; lo llevamos a 0..1 para poder mostrarlo como %.
  return (dot / denom + 1) / 2;
}

// ---------------------------------------------------------------------------
// Clasificación de arquetipo
// ---------------------------------------------------------------------------

export type ArchetypeMatch = {
  archetype: Archetype;
  score: number;
};

export function classifyArchetype(v: Vector, w: Weights = defaultWeights()): ArchetypeMatch[] {
  return ARCHETYPES.map((archetype) => ({
    archetype,
    score: Number(weightedCosine(v, archetype.vector, w).toFixed(4)),
  })).sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Recomendación de campaña
// ---------------------------------------------------------------------------

export type CampaignMatch = {
  campaign: CampaignProfile;
  /** 0..1 tras aplicar todos los ajustes. */
  score: number;
  /** Similitud cruda antes de los ajustes, útil para depurar. */
  rawScore: number;
  /** Razones legibles de por qué subió o bajó. */
  reasons: string[];
  /** true si choca con una línea roja: se descarta. */
  blocked: boolean;
};

export type RecommendContext = {
  experiencia?: ExperienciaValue | null;
  lineasRojas?: LineaRojaValue[];
};

/**
 * Rankea campañas para un perfil.
 *
 * Las líneas rojas NO son una penalización: son un descarte. Si alguien marcó
 * que no tolera horror corporal, no le ofrecemos la campaña de horror corporal
 * aunque el vector calce perfecto. Ese es exactamente el tipo de error que hace
 * que una persona no vuelva a la segunda sesión.
 */
export function recommendCampaigns(
  v: Vector,
  w: Weights = defaultWeights(),
  ctx: RecommendContext = {},
): CampaignMatch[] {
  const rojas = new Set(ctx.lineasRojas ?? []);

  const matches = CAMPAIGN_PROFILES.map((campaign) => {
    const rawScore = weightedCosine(v, campaign.vector, w);
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

    // Explicación del calce: las 2 dimensiones donde más coincide.
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

// ---------------------------------------------------------------------------
// Aprendizaje por feedback
// ---------------------------------------------------------------------------

export type Feedback = {
  /** El vector del jugador tal como quedó al terminar. */
  vector: Vector;
  /** Lo que el motor recomendó. */
  predicted: string;
  /** Lo que el Master decidió que en realidad correspondía. */
  actual: string;
};

/**
 * Ajusta los pesos a partir de una corrección del Master.
 *
 * Idea (un perceptrón, básicamente): si erramos, las dimensiones donde el
 * jugador se parecía MÁS a la campaña correcta que a la que predijimos son las
 * que había que mirar. Esas suben. Las que nos llevaron al error, bajan.
 *
 * `rate` es chico (0.08) a propósito: con pocas correcciones no querés que una
 * sola opinión reconfigure el motor. Diez correcciones consistentes mueven la
 * aguja; una sola apenas.
 */
export function learnFromFeedback(current: Weights, fb: Feedback, rate = 0.08): Weights {
  if (fb.predicted === fb.actual) return current; // acertamos, no tocamos nada

  const predicted = CAMPAIGN_PROFILES.find((c) => c.id === fb.predicted);
  const actual = CAMPAIGN_PROFILES.find((c) => c.id === fb.actual);
  if (!predicted || !actual) return current;

  const next: Weights = { ...current };

  for (const dim of DIMENSIONS) {
    const distToActual = Math.abs(fb.vector[dim] - actual.vector[dim]);
    const distToPredicted = Math.abs(fb.vector[dim] - predicted.vector[dim]);

    // Positivo = esta dimensión apuntaba a la respuesta correcta y no la
    // escuchamos lo suficiente. Negativo = nos desvió.
    const signal = distToPredicted - distToActual;

    next[dim] = Math.min(3, Math.max(0, next[dim] + signal * rate * 2));
  }

  // Renormalizamos para que la suma de pesos no derive con cada corrección:
  // queremos cambiar la FORMA del vector de pesos, no su magnitud.
  const sum = DIMENSIONS.reduce((acc, d) => acc + next[d], 0);
  const target = DIMENSIONS.length;
  if (sum > 0) {
    for (const dim of DIMENSIONS) {
      next[dim] = Number(((next[dim] * target) / sum).toFixed(4));
    }
  }

  return next;
}

// ---------------------------------------------------------------------------
// Mapeo del vector a los campos reales del formulario
// ---------------------------------------------------------------------------

export type InferredFormFields = {
  sistema: CampaignProfile["sistema"];
  tematica: CampaignProfile["tematica"];
  frecuencia: CampaignProfile["frecuencia"];
};

/**
 * Traduce la recomendación a los valores exactos del formulario, para que la
 * metadata inferida se pueda guardar junto al resto del registro sin
 * transformaciones raras.
 */
export function toFormFields(top: CampaignProfile): InferredFormFields {
  return {
    sistema: top.sistema,
    tematica: top.tematica,
    frecuencia: top.frecuencia,
  };
}

/** Mezcla vectores acumulando turnos: los últimos pesan un poco más. */
export function blendVectors(history: Vector[]): Vector {
  if (history.length === 0) return zeroVector();

  const out = zeroVector();
  let totalWeight = 0;

  history.forEach((v, i) => {
    // Peso creciente: el turno 5 dice más de la persona que el turno 1,
    // porque para entonces ya entendió cómo funciona el juego.
    const weight = 1 + i * 0.25;
    totalWeight += weight;
    for (const dim of DIMENSIONS) out[dim] += v[dim] * weight;
  });

  for (const dim of DIMENSIONS) {
    out[dim] = Number((out[dim] / totalWeight).toFixed(4));
  }
  return out;
}
