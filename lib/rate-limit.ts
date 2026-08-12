/**
 * Limitador best-effort en memoria.
 *
 * ATENCIÓN: en serverless cada instancia tiene su propio Map, así que esto NO
 * es un rate limit real. Sirve para frenar el spam trivial de un mismo cliente
 * que cae en la misma instancia caliente. La defensa de verdad contra bots es
 * el honeypot + el tiempo mínimo de llenado del formulario (ver el endpoint),
 * que no dependen de estado compartido.
 *
 * Si algún día crece: Upstash Redis tiene capa gratis y `@upstash/ratelimit`.
 */

type Bucket = { resetAt: number; count: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

export function rateLimit(key: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now();

  // Limpieza barata para que el Map no crezca sin control.
  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k);
    }
  }

  const cur = buckets.get(key);
  if (!cur || cur.resetAt < now) {
    buckets.set(key, { resetAt: now + windowMs, count: 1 });
    return true;
  }
  if (cur.count >= max) return false;

  cur.count += 1;
  return true;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "anon";
}
