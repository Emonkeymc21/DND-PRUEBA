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
  },

  // ---- Nuevos videos (marzo 2026) ----
  {
    title: "Mi primera vez jugando D&D (Jaiden Animations – fandub ES)",
    youtubeId: "q7TqboGL1uc",
    category: "Inspiración",
    notes:
      "Historia divertida y súper compartible: perfecto para romper el hielo y decir “ok, esto suena increíble”.",
    campaignIdea:
      "Arrancá con un one‑shot de 60–90 min centrado en comedia + decisiones simples (ideal para primera mesa)."
  },
  {
    title: "Demostración: Dungeons & Dragons en español (tutorial / mesa)",
    youtubeId: "h40wgM6QPL0",
    category: "Reglas",
    notes:
      "Demostración práctica: se entiende el flujo real de una sesión sin explicar teoría pesada.",
    campaignIdea:
      "Usalo como “capítulo 0”: mini‑escena guiada para mostrar tiradas, turnos y roleo en 10 minutos."
  },
  {
    title: "¿Cómo comenzar a jugar Dungeons and Dragons? (guía)",
    youtubeId: "ale4cC9PnOQ",
    category: "Reglas",
    notes:
      "Guía directa para arrancar desde cero. Muy bueno para enviar a quien te dice “quiero pero no sé cómo”.",
    campaignIdea:
      "CTA: “Te dejo esto y después hacés el test de 20 segundos para entrar a tu primera mesa”."
  },

];

/**
 * Pista de música ambiente del botón flotante.
 * Cambiala por cualquier ID de YouTube (lo que va después de ?v= en la URL).
 */
export const MUSIC_VIDEO_ID = "wNKZkFs-hvE";

export const PLAYLIST_URL = "";

/**
 * ⚠️ IMPORTANTE: verificá que cada youtubeId siga existiendo antes de publicar.
 * Los videos se borran o se hacen privados y queda un reproductor en negro.
 * Chequeo rápido: abrí https://www.youtube.com/watch?v=EL_ID en incógnito.
 */
