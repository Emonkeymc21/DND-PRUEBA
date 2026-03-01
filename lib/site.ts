const defaultUrl = "http://localhost:3000";

export const SITE = {
  name: "Grimorio D&D",
  // En Netlify existe `URL` automáticamente (dominio del deploy).
  url: process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || defaultUrl,
  description: "Aprendé D&D en español: guías, videos curados, simulador narrado, creador de personajes SRD y campañas.",
  ogImage: "/og.png"
} as const;
