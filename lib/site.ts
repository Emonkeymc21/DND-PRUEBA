const defaultUrl = "http://localhost:3000";

function clean(v: string | undefined): string {
  return (v ?? "").trim();
}

/**
 * Contactos de respaldo. Si el backend se cae, el formulario los muestra
 * para que la persona igual pueda escribirte. Nunca perder un lead.
 */
export const CONTACT = {
  instagram: clean(process.env.NEXT_PUBLIC_CONTACT_INSTAGRAM),
  discord: clean(process.env.NEXT_PUBLIC_CONTACT_DISCORD),
  whatsapp: clean(process.env.NEXT_PUBLIC_CONTACT_WHATSAPP),
} as const;

export function hasAnyContact(): boolean {
  return Boolean(CONTACT.instagram || CONTACT.discord || CONTACT.whatsapp);
}

export const SITE = {
  name: "La Mesa Perdida",
  url:
    clean(process.env.NEXT_PUBLIC_SITE_URL) ||
    clean(process.env.URL) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    defaultUrl,
  description:
    "Mesas de rol en español para gente que nunca jugó y para veteranos. Fantasía, terror, anime o sci-fi. Postulate y te armamos grupo.",
  ogImage: "/og.png",
} as const;
