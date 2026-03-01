import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL en el entorno.");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require" });

const campaigns = [
  {
    slug: "oneshot-tutorial",
    title: "One-shot Tutorial (Nivel 1)",
    description: "Ideal para gente nueva: reglas mínimas, mucho roleo, combate cortito y final épico.",
    is_open: true
  },
  {
    slug: "campana-epica",
    title: "Campaña Épica (Niveles 1-5)",
    description: "Aventura clásica con misterio, facciones, exploración y decisiones con consecuencias.",
    is_open: true
  }
];

try {
  for (const c of campaigns) {
    await sql`
      insert into campaigns (slug, title, description, is_open)
      values (${c.slug}, ${c.title}, ${c.description}, ${c.is_open})
      on conflict (slug) do update set
        title = excluded.title,
        description = excluded.description,
        is_open = excluded.is_open
    `;
  }
  console.log("✅ Seed aplicado.");
} finally {
  await sql.end({ timeout: 5 });
}
