export type CampaignGenre = "Fantasía" | "Terror" | "Sci‑Fi" | "Anime" | "Misterio" | "Épica";

export type Campaign = {
  id: string;
  is_open: boolean;
  slug: string;
  title: string;
  genre: CampaignGenre;
  system: string;
  tone: string;
  duration: string;
  difficulty: string;
  seats: string;
  description: string;
  hooks: string[];
  formEmbedUrl: string;
};

export const CAMPAIGNS: Campaign[] = [
  {
    slug: "el-llamado",
    id: "el-llamado",
    is_open: true,    title: "El Llamado (One‑Shot de Inicio)",
    genre: "Fantasía",
    system: "D&D 5e (SRD)",
    tone: "Aventura, humor, épica",
    duration: "1 sesión (2–4 hs)",
    difficulty: "Fácil (nuevo friendly)",
    seats: "3–5 jugadores",
    description:
      "Una taberna, un mensaje sellado y una deuda antigua. Ideal para aprender lo básico: tiradas, roleo, combate corto y decisiones.",
    hooks: [
      "Aprendés lo esencial jugando",
      "Combate simple + skill checks",
      "Final con giro",
    ],
    formEmbedUrl: "https://docs.google.com/forms/d/e/1FAIpQLScP2cSEbMdsVes4w8f1frB9hZSwP7xFsXjaY_Smm6AcGJsq3A/viewform?embedded=true",
  },
  {
    slug: "umbral-rojo",
    id: "umbral-rojo",
    is_open: true,    title: "El Umbral Rojo",
    genre: "Terror",
    system: "D&D 5e (SRD)",
    tone: "Horror, tensión, supervivencia",
    duration: "Mini‑arco (3–6 sesiones)",
    difficulty: "Media",
    seats: "3–5 jugadores",
    description:
      "El bosque te devuelve la mirada. Una aldea entera recuerda un nombre que nadie debería pronunciar. Decisiones con peso y consecuencias.",
    hooks: [
      "Tensión narrativa (velas apagadas)",
      "Pistas, paranoia y secretos",
      "Final alternativo según elecciones",
    ],
    formEmbedUrl: "https://docs.google.com/forms/d/e/1FAIpQLScP2cSEbMdsVes4w8f1frB9hZSwP7xFsXjaY_Smm6AcGJsq3A/viewform?embedded=true",
  },
  {
    slug: "neon-y-acero",
    id: "neon-y-acero",
    is_open: true,    title: "Neón y Acero",
    genre: "Sci‑Fi",
    system: "D&D 5e (adaptación ligera)",
    tone: "Cyberpunk, acción, intriga",
    duration: "Mini‑arco (4–8 sesiones)",
    difficulty: "Media/Alta",
    seats: "3–5 jugadores",
    description:
      "Corporaciones, callejones húmedos y un chip que no debería existir. Hackeos (skill checks), persecuciones y acuerdos que salen caros.",
    hooks: [
      "Misiones estilo 'heist'",
      "Recompensas y traiciones",
      "Estética neon + música",
    ],
    formEmbedUrl: "https://docs.google.com/forms/d/e/1FAIpQLScP2cSEbMdsVes4w8f1frB9hZSwP7xFsXjaY_Smm6AcGJsq3A/viewform?embedded=true",
  },
  {
    slug: "sellos-rotos",
    id: "sellos-rotos",
    is_open: true,    title: "Sellos Rotos",
    genre: "Anime",
    system: "D&D 5e (shonen vibes)",
    tone: "Shonen, poder creciente, drama",
    duration: "Arco (6–12 sesiones)",
    difficulty: "Media",
    seats: "3–6 jugadores",
    description:
      "Un torneo, un juramento y un sello ancestral que se agrieta. Subís de nivel como protagonista: momentos hype, rivalidades y revelaciones.",
    hooks: [
      "Combos y escenas cinematográficas",
      "Rivales recurrentes",
      "Momentos 'power‑up' narrativos",
    ],
    formEmbedUrl: "https://docs.google.com/forms/d/e/1FAIpQLScP2cSEbMdsVes4w8f1frB9hZSwP7xFsXjaY_Smm6AcGJsq3A/viewform?embedded=true",
  },
  {
    slug: "la-corona-de-ceniza",
    id: "la-corona-de-ceniza",
    is_open: true,    title: "La Corona de Ceniza",
    genre: "Épica",
    system: "D&D 5e (SRD)",
    tone: "Alta fantasía, política, guerra",
    duration: "Campaña larga (12+ sesiones)",
    difficulty: "Media/Alta",
    seats: "4–6 jugadores",
    description:
      "Reinos que se quiebran, pactos prohibidos y una corona que nadie debería portar. Diplomacia, batallas y decisiones de largo alcance.",
    hooks: [
      "Política + misiones de élite",
      "Batallas con objetivos",
      "Final por 'rutas' según alianzas",
    ],
    formEmbedUrl: "https://docs.google.com/forms/d/e/1FAIpQLScP2cSEbMdsVes4w8f1frB9hZSwP7xFsXjaY_Smm6AcGJsq3A/viewform?embedded=true",
  },
];

export const CAMPAIGN_FORM_EMBED_URL = "https://docs.google.com/forms/d/e/1FAIpQLScP2cSEbMdsVes4w8f1frB9hZSwP7xFsXjaY_Smm6AcGJsq3A/viewform?embedded=true";


// Alias para compatibilidad con imports anteriores
export const CAMPAIGN_EXAMPLES = CAMPAIGNS;

export const CAMPAIGN_EXAMPLES_NOTICE = "⚠️ Estas campañas son EJEMPLOS de propuestas que podrían darse. Podés usarlas como inspiración o plantilla.";
