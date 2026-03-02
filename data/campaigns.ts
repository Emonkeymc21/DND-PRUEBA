export type CampaignGenre = "Fantasía" | "Terror" | "Sci‑Fi" | "Anime" | "Humor" | "Misterio";

export type CampaignExample = {
  id: number;
  slug: string;
  title: string;
  genre: CampaignGenre[];
  level: string;
  duration: string;
  system: string;
  description: string;
  highlights: string[];
  is_open: boolean;
};

export const CAMPAIGN_EXAMPLES: CampaignExample[] = [
  {
    id: 1,
    slug: "la-mina-perdida-de-fogmarsh",
    title: "La Mina Perdida de Fogmarsh",
    genre: ["Fantasía", "Misterio"],
    level: "Niveles 1–5",
    duration: "4–6 sesiones",
    system: "D&D 5e (SRD friendly)",
    description:
      "Un mapa viejo, un pueblo con secretos y una mina que no debería volver a abrirse. Aventuras clásicas, ritmo rápido y decisiones que cambian el destino del valle.",
    highlights: ["Exploración", "Combate táctico", "NPCs memorables", "Final con giro"],
    is_open: true
  },
  {
    id: 2,
    slug: "cazadores-de-sombras-zenin",
    title: "Cazadores de Sombras: Zenin Protocol",
    genre: ["Anime", "Terror", "Misterio"],
    level: "Niveles 3–7",
    duration: "6–10 sesiones",
    system: "5e + reglas ligeras (cinemático)",
    description:
      "Exorcistas, maldiciones y un barrio donde las luces parpadean cuando cae el sol. Técnica especial + tensión real. Si te gusta Jujutsu Kaisen: estás en casa.",
    highlights: ["Técnicas/estilos", "Investigación", "Boss fights", "Decisiones morales"],
    is_open: true
  },
  {
    id: 3,
    slug: "neon-ruins-77",
    title: "Neon Ruins ’77",
    genre: ["Sci‑Fi", "Humor", "Misterio"],
    level: "One‑shot / 1–2 sesiones",
    duration: "1 noche",
    system: "Sistema ligero narrativo (sin estrés)",
    description:
      "Hackers, neón, corporaciones y un paquete que jamás debiste aceptar. Ideal para probar rol sin abrumarte: poco reglamento, muchas decisiones.",
    highlights: ["Heists", "Tensión + humor", "Finales múltiples", "Perfecta para nuevos"],
    is_open: true
  },
  {
    id: 4,
    slug: "la-tabla-rota-de-valdis",
    title: "La Tabla Rota de Valdis",
    genre: ["Terror", "Fantasía"],
    level: "Niveles 5–9",
    duration: "8–12 sesiones",
    system: "D&D 5e",
    description:
      "Un bosque que respira, una aldea que miente y una entidad que responde a los nombres que nadie pronuncia. Oscura, intensa, pero con épica.",
    highlights: ["Terror atmosférico", "Ritual final", "Aliados ambiguos", "Consecuencias duras"],
    is_open: false
  },
  {
    id: 5,
    slug: "academia-arkana",
    title: "Academia Arkana",
    genre: ["Fantasía", "Misterio", "Humor"],
    level: "Niveles 1–4",
    duration: "3–5 sesiones",
    system: "5e (suave)",
    description:
      "Escuela de magia, rivalidades, exámenes rarísimos y un misterio bajo la biblioteca prohibida. Vibes de mundo mágico, ideal para roleo.",
    highlights: ["Social", "Misterios", "Hechizos creativos", "Misiones cortas"],
    is_open: true
  }
];
