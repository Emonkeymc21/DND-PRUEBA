import { z } from "zod";

export const SRD_BASE = "https://www.dnd5eapi.co";

const ListSchema = z.object({
  count: z.number(),
  results: z.array(z.object({ index: z.string(), name: z.string(), url: z.string() }))
});

export type SrdListItem = z.infer<typeof ListSchema>["results"][number];

export async function srdList(resource: "races" | "classes" | "backgrounds" | "skills" | "equipment-categories" | "spells") {
  const res = await fetch(`${SRD_BASE}/api/2014/${resource}`, { next: { revalidate: 60 * 60 * 24 } });
  if (!res.ok) throw new Error(`SRD API error: ${resource}`);
  const json = await res.json();
  return ListSchema.parse(json).results;
}

export async function srdGet(url: string) {
  const res = await fetch(`${SRD_BASE}${url}`, { next: { revalidate: 60 * 60 * 24 } });
  if (!res.ok) throw new Error(`SRD API error: ${url}`);
  return res.json();
}

export const ES = {
  abilities: {
    STR: "FUE",
    DEX: "DES",
    CON: "CON",
    INT: "INT",
    WIS: "SAB",
    CHA: "CAR"
  },
  skills: {
    "Acrobatics": "Acrobacias",
    "Animal Handling": "Trato con Animales",
    "Arcana": "Arcanos",
    "Athletics": "Atletismo",
    "Deception": "Engaño",
    "History": "Historia",
    "Insight": "Perspicacia",
    "Intimidation": "Intimidación",
    "Investigation": "Investigación",
    "Medicine": "Medicina",
    "Nature": "Naturaleza",
    "Perception": "Percepción",
    "Performance": "Actuación",
    "Persuasion": "Persuasión",
    "Religion": "Religión",
    "Sleight of Hand": "Juego de Manos",
    "Stealth": "Sigilo",
    "Survival": "Supervivencia"
  }
} as const;

export function toEsSkill(name: string) {
  return (ES.skills as Record<string, string>)[name] ?? name;
}
