import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL en el entorno.");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require" });
const schemaPath = path.join(process.cwd(), "db", "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf-8");

try {
  await sql.unsafe(schema);
  console.log("✅ Schema aplicado.");
} finally {
  await sql.end({ timeout: 5 });
}
