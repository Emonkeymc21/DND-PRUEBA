export type CampaignGenre = "Fantasía" | "Terror" | "Sci‑Fi" | "Anime" | "Humor" | "Épica" | "Misterio";
export type CampaignStyle = "One‑shot" | "Mini‑campaña" | "Campaña larga";

export type Campaign = {
  id: string;
  slug: string;
  title: string;
  description: string;
  genre: CampaignGenre | CampaignGenre[];
  style: CampaignStyle;
  levelRange: string;
  is_open: boolean;
  tags?: string[];
};

export const CAMPAIGN_EXAMPLES_NOTICE =
  "⚠️ Estas campañas son EJEMPLOS de propuestas que podrían darse. Podés usarlas como inspiración o plantilla.";

export const CAMPAIGNS: Campaign[] = [
  {
    id: "c1",
    slug: "taberna-del-cometa",
    title: "La Taberna del Cometa",
    description:
      "Fantasía épica clásica: una taberna aparece en distintos mundos. Cada noche trae un contrato nuevo y un secreto.",
    genre: ["Fantasía", "Épica", "Misterio"],
    style: "Mini‑campaña",
    levelRange: "Nivel 1–5",
    is_open: true,
    tags: ["dungeon", "roleplay", "misterio"]
  },
  {
    id: "c2",
    slug: "ark-zero",
    title: "ARK‑ZERO: Señal en el Vacío",
    description:
      "Sci‑fi con horror: una nave abandonada transmite una señal imposible. sistemas autónomos, corredores sin luz y decisiones duras.",
    genre: ["Sci‑Fi", "Terror"],
    style: "One‑shot",
    levelRange: "Nivel 3–4",
    is_open: true,
    tags: ["sci‑fi", "survival", "horror"]
  },
  {
    id: "c3",
    slug: "jujutsu-sombras",
    title: "Sombras de Maleficio",
    description:
      "Anime/shonen: técnicas, maldiciones y combates cinemáticos. Entrenamiento + misión urgente en la ciudad.",
    genre: ["Anime", "Fantasía"],
    style: "Mini‑campaña",
    levelRange: "Nivel 1–3",
    is_open: true,
    tags: ["anime", "acción", "técnicas"]
  },
  {
    id: "c4",
    slug: "bosque-de-los-velos",
    title: "El Bosque de los Velos",
    description:
      "Terror y misterio: un bosque ‘recuerda’ a los que entran. Las líneas y velos se respetan: tensión sin exceso.",
    genre: ["Terror", "Misterio"],
    style: "One‑shot",
    levelRange: "Nivel 2–3",
    is_open: false,
    tags: ["misterio", "investigación", "terror suave"]
  }
];
