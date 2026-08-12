import postgres from "postgres";

/**
 * Conexión Postgres pensada para serverless (Vercel / Netlify Functions).
 *
 * Claves:
 * - Una sola instancia por proceso (evita abrir una conexión por request).
 * - `max: 1` porque cada invocación serverless es un proceso aislado y corto.
 *   Si usás Neon, además tenés que usar la connection string CON POOLER.
 * - `isDbConfigured()` permite que el sitio funcione aunque no haya DB,
 *   cayendo al webhook de Discord como backend alternativo.
 */

let _sql: postgres.Sql | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function db(): postgres.Sql {
  if (_sql) return _sql;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no configurada. Revisá .env.local y el README.");
  }

  _sql = postgres(url, {
    ssl: "require",
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // necesario con poolers en modo transaction (Neon/Supabase)
  });

  return _sql;
}
