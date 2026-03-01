export type VideoCategory = "Reglas" | "Crear PJ" | "Ser DM" | "Combate";

export type CuratedVideo = {
  title: string;
  youtubeId: string;
  category: VideoCategory;
};

export const VIDEOS: CuratedVideo[] = [
  { title: "¿Qué es D&D? (intro)", youtubeId: "aQy7V0f6mYk", category: "Reglas" },
  { title: "Reglas básicas (explicación)", youtubeId: "lZVfJkHnWZk", category: "Reglas" },
  { title: "Cómo crear personaje rápido", youtubeId: "7S8m8fXGvJY", category: "Crear PJ" },
  { title: "Primer combate explicado", youtubeId: "hY0bC4f8s1c", category: "Combate" },
];

export const PLAYLIST_URL = "https://www.youtube.com/playlist?list=PLyGJ9mZ8c2F8PZQ";
