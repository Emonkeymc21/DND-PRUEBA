/**
 * Persistencia opcional vía Upstash Redis (API REST).
 *
 * Reemplaza a Postgres para las dos cosas que necesitaban guardar estado
 * entre invocaciones: los pesos del recomendador y los nodos que el Master
 * agrega al árbol narrativo. Nada de SQL, nada de `RowList`, nada de driver:
 * es HTTP puro con `fetch`, igual que el resto de las integraciones externas
 * de este proyecto.
 *
 * Es OPCIONAL. Sin `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`, el
 * sitio funciona igual: los valores viven en memoria del proceso serverless
 * mientras esa instancia esté caliente, y vuelven al default en el próximo
 * cold start. Para persistencia real entre despliegues, Upstash tiene capa
 * gratis: https://upstash.com — creás una base Redis y copiás las dos
 * variables desde su consola.
 */

function isConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function command(args: (string | number)[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${url}/${args.map((a) => encodeURIComponent(String(a))).join("/")}`, {
      headers: { authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result: unknown };
    return data.result;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (!isConfigured()) return null;
  const raw = await command(["get", key]);
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<boolean> {
  if (!isConfigured()) return false;
  const result = await command(["set", key, JSON.stringify(value)]);
  return result === "OK";
}

/** Guarda al principio de una lista y la recorta a `max` elementos. */
export async function kvPushCapped(key: string, value: unknown, max = 50): Promise<boolean> {
  if (!isConfigured()) return false;
  const ok = await command(["lpush", key, JSON.stringify(value)]);
  if (ok === null) return false;
  await command(["ltrim", key, "0", String(max - 1)]);
  return true;
}

export async function kvList<T>(key: string, limit = 50): Promise<T[]> {
  if (!isConfigured()) return [];
  const raw = await command(["lrange", key, "0", String(limit - 1)]);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      try {
        return JSON.parse(item as string) as T;
      } catch {
        return null;
      }
    })
    .filter((v): v is T => v !== null);
}

export function isKvConfigured(): boolean {
  return isConfigured();
}
