import postgres from "postgres";

let _sql: postgres.Sql | null = null;

export function db() {
  if (_sql) return _sql;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL no configurada. Revisá .env.local y el README.");
  }

  // En serverless conviene una sola instancia.
  _sql = postgres(url, { ssl: "require" });
  return _sql;
}
