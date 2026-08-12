import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("\n❌ Falta DATABASE_URL.\n");
  console.error("   1) Creá una base gratis en https://neon.tech");
  console.error("   2) Copiá la connection string (la que dice '-pooler')");
  console.error("   3) Pegala en .env.local como DATABASE_URL=...\n");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1 });
const schemaPath = path.join(process.cwd(), "db", "schema.sql");

try {
  const schema = fs.readFileSync(schemaPath, "utf-8");
  await sql.unsafe(schema);
  console.log("✅ Schema aplicado correctamente.");

  const [{ count }] = await sql`select count(*)::int as count from signups`;
  console.log(`   Postulaciones actuales en la base: ${count}`);
} catch (err) {
  console.error("❌ Error aplicando el schema:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
