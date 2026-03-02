export type VideoCategory =
  | "Reglas"
  | "Crear PJ"
  | "Ser DM"
  | "Combate"
  | "Inspiración"
  | "Campañas";

export type CuratedVideo = {
  title: string;
  youtubeId: string;
  category: VideoCategory;
  notes?: string;
  campaignIdea?: string;
};

export const VIDEOS: CuratedVideo[] = [
  // ---- Videos del INDEX original ----
  {
    title: "Introducción / ejemplo para inspirarte",
    youtubeId: "DPTihWkXtEE",
    category: "Inspiración",
    notes: "Uno de los videos que estaban embebidos en el index original."
  },
  {
    title: "Qué necesitás para jugar (checklist rápido)",
    youtubeId: "YJbaGMvydS4",
    category: "Reglas",
    notes: "Video del index original. Ideal para explicar 'qué es D&D' y cómo arrancar."
  },
  {
    title: "Clip corto: minotauro / humor (inspiración)",
    youtubeId: "PJxd_s-VMmQ",
    category: "Inspiración",
    notes: "Enlace del index original (short). Sirve para sumar energía y vibes."
  },

  // ---- Tus videos nuevos ----
  {
    title: "D&D con CLERSSSSS | El Rey sin Corazón (PARTE 1)",
    youtubeId: "fUdwmhtmk1g",
    category: "Campañas",
    notes: "Para tomar ritmo: escenas, decisiones, roleo y resolución.",
    campaignIdea: "Campaña tipo 'road‑movie' con misterio y NPCs recurrentes."
  },
  {
    title: "Guía / partida (referencia extra)",
    youtubeId: "pFuEgCNBM7w",
    category: "Reglas",
    notes: "Referencia extra. Si el video cambia, podés editar título/nota acá.",
    campaignIdea: "One‑shot tutorial: explicar d20, DC, ventaja, combate simple."
  },
  {
    title: "Flickering Mist | The Door of Ebralgon [D&D SHOW]",
    youtubeId: "na7emqvAsis",
    category: "Campañas",
    notes: "Buen material para ideas de escenas y tono narrativo.",
    campaignIdea: "Campaña de terror/misterio con niebla, puertas y 'señales' sobrenaturales."
  }
];

export const PLAYLIST_URL = "";
