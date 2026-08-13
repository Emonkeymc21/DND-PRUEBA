import { kvGet, kvSet, isKvConfigured } from "@/lib/kv";
import { defaultWeights, sanitizeWeights, type Weights } from "@/lib/ml/recommend";

/**
 * Persistencia de los pesos del recomendador.
 *
 * Antes vivían en Postgres. Ahora en Upstash Redis (opcional) vía lib/kv.ts,
 * con cache en memoria de 60s para no pegarle a la red en cada turno del
 * simulador. Sin Upstash configurado, el motor sigue funcionando con los
 * pesos por defecto — simplemente no aprende entre reinicios del proceso.
 */

const KEY = "mesa:ml:weights";
const CACHE_TTL_MS = 60_000;

let cache: { weights: Weights; at: number } | null = null;

export async function loadWeights(): Promise<Weights> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.weights;

  const stored = await kvGet<Weights>(KEY);
  const weights = stored ? sanitizeWeights(stored) : defaultWeights();
  cache = { weights, at: Date.now() };
  return weights;
}

export async function saveWeights(weights: Weights): Promise<boolean> {
  cache = { weights, at: Date.now() };
  return kvSet(KEY, weights);
}

export function invalidateWeightsCache(): void {
  cache = null;
}

export function weightsPersistenceAvailable(): boolean {
  return isKvConfigured();
}
