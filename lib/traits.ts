/**
 * Perfil de jugador.
 *
 * Cuatro ejes que se van moviendo con lo que la persona hace en el simulador.
 * Sirven para dos cosas:
 *   1. Mostrarle un espejo divertido de cómo juega.
 *   2. Llegar como metadata en la postulación, así sabés a qué mesa mandarlo
 *      antes de la primera charla.
 *
 * Los ejes 0..100 son "cantidad de". Los ejes bipolares (-100..100) son
 * "tendencia hacia", con 0 = equilibrado.
 */

export type Traits = {
  /** 0..100 — qué tan fuera del molde resuelve. */
  creatividad: number;
  /** 0..100 — cuánto involucra al grupo en vez de ir solo. */
  equipo: number;
  /** -100 (caótico) .. 100 (legal) — improvisa o respeta el sistema. */
  ley: number;
  /** -100 (rol puro) .. 100 (combate puro) — cómo prefiere resolver. */
  combate: number;
};

export const TRAIT_KEYS = ["creatividad", "equipo", "ley", "combate"] as const;

export const NEUTRAL_TRAITS: Traits = {
  creatividad: 50,
  equipo: 50,
  ley: 0,
  combate: 0,
};

export const TRAIT_META: Record<
  keyof Traits,
  { label: string; bipolar: boolean; low: string; high: string; hint: string }
> = {
  creatividad: {
    label: "Creatividad",
    bipolar: false,
    low: "Directo",
    high: "Impredecible",
    hint: "Cuánto se sale del camino obvio",
  },
  equipo: {
    label: "Trabajo en equipo",
    bipolar: false,
    low: "Lobo solitario",
    high: "Pilar del grupo",
    hint: "Cuánto suma al resto de la party",
  },
  ley: {
    label: "Caótico ↔ Legal",
    bipolar: true,
    low: "Caótico",
    high: "Legal",
    hint: "Improvisa o respeta las reglas",
  },
  combate: {
    label: "Rol ↔ Combate",
    bipolar: true,
    low: "Rol",
    high: "Combate",
    hint: "Resuelve hablando o peleando",
  },
};

export type TraitDelta = Partial<Record<keyof Traits, number>>;

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Aplica un delta respetando el rango de cada eje. */
export function applyTraitDelta(current: Traits, delta: TraitDelta): Traits {
  return {
    creatividad: clamp(current.creatividad + (delta.creatividad ?? 0), 0, 100),
    equipo: clamp(current.equipo + (delta.equipo ?? 0), 0, 100),
    ley: clamp(current.ley + (delta.ley ?? 0), -100, 100),
    combate: clamp(current.combate + (delta.combate ?? 0), -100, 100),
  };
}

/**
 * Sanea un delta que viene de afuera (la IA puede alucinar números enormes o
 * claves inventadas). Cada turno mueve como mucho 18 puntos por eje: así una
 * sola respuesta no define el perfil entero.
 */
export function sanitizeTraitDelta(raw: unknown): TraitDelta {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: TraitDelta = {};

  for (const key of TRAIT_KEYS) {
    const v = src[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[key] = clamp(Math.round(v), -18, 18);
    }
  }
  return out;
}

/** Etiquetas cortas para mostrar y para guardar en la postulación. */
export function traitsToTags(t: Traits): string[] {
  const tags: string[] = [];

  if (t.creatividad >= 70) tags.push("Creativo");
  else if (t.creatividad <= 30) tags.push("Directo");

  if (t.equipo >= 70) tags.push("Jugador de equipo");
  else if (t.equipo <= 30) tags.push("Lobo solitario");

  if (t.ley >= 35) tags.push("Legal");
  else if (t.ley <= -35) tags.push("Caótico");
  else tags.push("Neutral");

  if (t.combate >= 35) tags.push("Combate");
  else if (t.combate <= -35) tags.push("Narrativa");
  else tags.push("Equilibrado");

  return tags;
}

/** Frase de cierre con un poco de personalidad. */
export function describeProfile(t: Traits): string {
  const eje =
    t.ley <= -35
      ? t.combate >= 35
        ? "Sos el que patea la puerta antes de que alguien proponga un plan."
        : "Improvisás sobre la marcha y te sale bien más veces de las que debería."
      : t.ley >= 35
        ? t.combate >= 35
          ? "Peleás con plan: posición, turnos y nada librado al azar."
          : "Buscás el acuerdo, el contrato y la salida limpia."
        : "Leés la mesa y te adaptás a lo que la escena pide.";

  const social =
    t.equipo >= 70
      ? " Y sobre todo: hacés quedar bien al resto."
      : t.equipo <= 30
        ? " Preferís resolver por tu cuenta."
        : "";

  return eje + social;
}

/** Clase de personaje sugerida (guiño, no dogma). */
export function suggestClass(t: Traits): string {
  if (t.combate >= 40 && t.ley >= 30) return "Paladín";
  if (t.combate >= 40 && t.ley <= -30) return "Bárbaro";
  if (t.combate >= 40) return "Guerrero";
  if (t.creatividad >= 70 && t.ley <= -20) return "Pícaro";
  if (t.creatividad >= 70) return "Mago";
  if (t.equipo >= 70) return "Clérigo";
  if (t.combate <= -40) return "Bardo";
  return "Explorador";
}
