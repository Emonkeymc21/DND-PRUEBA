import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL en el entorno.");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require" });

const campaigns = [
  {
    slug: "oneshot-el-llamado",
    title: "One‑shot: El Llamado (Nivel 1)",
    description: "Ideal para gente nueva. Tutorial completo: roleo, 1 check clave, mini combate y cierre.",
    is_open: true
  },
  {
    slug: "stranger-umbral",
    title: "Stranger / Terror: El Umbral Rojo (Niveles 1‑3)",
    description: "Aire ochentoso, misterio, cultos y decisiones que te siguen. Horror suave (líneas/velos).",
    is_open: true
  },
  {
    slug: "fantasia-corona-ceniza",
    title: "Fantasía Épica: La Corona de Ceniza (Niveles 1‑5)",
    description: "Dragones, reliquias, facciones y exploración. Aventuras con consecuencias reales.",
    is_open: true
  },
  {
    slug: "anime-sellos-rotos",
    title: "Anime / Shonen: Sellos Rotos (Niveles 1‑4)",
    description: "Técnicas especiales, duelos intensos y enemigos con nombre. Mucha acción y estética shonen.",
    is_open: true
  },
  {
    slug: "cyberpunk-neon",
    title: "Sci‑Fi / Cyberpunk: Neón y Acero (Niveles 1‑4)",
    description: "Conspiración corporativa, hackers, callejones y naves. Modo táctico + investigación.",
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
