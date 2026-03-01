export type VideoCategory =
  | "Reglas"
  | "Crear PJ"
  | "Ser DM"
  | "Combate"
  | "Inspiración";

export type CuratedVideo = {
  title: string;
  youtubeId: string;
  category: VideoCategory;
  notes?: string;
};

export const VIDEOS: CuratedVideo[] = [
  {
    title: "Partida / ejemplo (referencia 1)",
    youtubeId: "fUdwmhtmk1g",
    category: "Inspiración",
    notes: "Útil para ver ritmo, escenas y cómo se resuelven decisiones."
  },
  {
    title: "Reglas / explicación (referencia 2)",
    youtubeId: "pFuEgCNBM7w",
    category: "Reglas",
    notes: "Para sacar ideas de cómo explicar checks, iniciativa y acciones."
  },
  {
    title: "Creador / armado de PJ (referencia 3)",
    youtubeId: "na7emqvAsis",
    category: "Crear PJ",
    notes: "Para tomar ejemplos de atributos, trasfondo y equipo inicial."
  }
];

// Si querés curar una playlist completa, pegala acá:
export const PLAYLIST_URL = "";
