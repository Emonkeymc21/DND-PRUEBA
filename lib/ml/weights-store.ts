import { db, isDbConfigured } from "@/lib/db";
import { defaultWeights, sanitizeWeights, type Weights } from "@/lib/ml/recommend";

/**
 * Persistencia de los pesos del modelo.
 *
 * Los pesos viven en una fila única de la tabla `ml_weights`. Si no hay base de
 * datos configurada, se usan los pesos por defecto: el motor sigue funcionando,
 * simplemente no aprende entre reinicios.
 *
 * Cache en memoria con TTL corto para no pegarle a Postgres en cada turno del
 * simulador; 60 segundos de desactualización en un recomendador de mesas de rol
 * no le hace mal a nadie.
 */

const CACHE_TTL_MS = 60_000;

let cache: { weights: Weights; at: number } | null = null;

export async function loadWeights(): Promise<Weights> {
  if (!isDbConfigured()) return defaultWeights();

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.weights;

  try {
    const sql = db();
    const rows = await sql<{ weights: unknown }[]>`
      select weights from ml_weights where id = 1 limit 1
    `;

    const weights = rows.length > 0 ? sanitizeWeights(rows[0]!.weights) : defaultWeights();
    cache = { weights, at: Date.now() };
    return weights;
  } catch (err) {
    console.error("[ml] no se pudieron leer los pesos:", err);
    return defaultWeights();
  }
}

export async function saveWeights(weights: Weights, note: string | null = null): Promise<boolean> {
  if (!isDbConfigured()) return false;

  try {
    const sql = db();
    await sql`
      insert into ml_weights (id, weights, note, updated_at)
      values (1, ${JSON.stringify(weights)}::jsonb, ${note}, now())
      on conflict (id) do update
        set weights = excluded.weights,
            note = excluded.note,
            updated_at = now()
    `;
    cache = { weights, at: Date.now() };
    return true;
  } catch (err) {
    console.error("[ml] no se pudieron guardar los pesos:", err);
    return false;
  }
}

/** Invalida el cache: lo usa el endpoint de feedback tras escribir. */
export function invalidateWeightsCache(): void {
  cache = null;
}
