/**
 * Aviso instantáneo por webhook de Discord.
 *
 * Por qué importa: si una postulación cae en una tabla de Postgres y nadie
 * entra al panel en 3 días, esa persona ya se fue a otra mesa. El webhook
 * te llega al celular en el momento.
 *
 * Cómo obtener la URL:
 *   Discord > (tu servidor) > Ajustes del canal > Integraciones > Webhooks
 *   > Nuevo webhook > Copiar URL  ->  pegala en DISCORD_WEBHOOK_URL
 *
 * Si además NO tenés DATABASE_URL, el webhook funciona como backend único:
 * las postulaciones te llegan igual, solo que sin panel ni CSV.
 */

export function isWebhookConfigured(): boolean {
  const url = process.env.DISCORD_WEBHOOK_URL ?? "";
  return url.startsWith("https://discord.com/api/webhooks/") ||
    url.startsWith("https://discordapp.com/api/webhooks/");
}

type NotifyPayload = {
  name: string;
  contact: string;
  mode: string;
  experience: string;
  availability: string[];
  themes: string[];
  notes?: string | null;
  id?: number | string | null;
};

function field(name: string, value: string, inline = true) {
  const safe = value.trim().slice(0, 1024) || "—";
  return { name: name.slice(0, 256), value: safe, inline };
}

export async function notifyDiscord(data: NotifyPayload): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url || !isWebhookConfigured()) return false;

  const body = {
    username: "La Mesa Perdida",
    embeds: [
      {
        title: "🎲 Nueva postulación",
        description: data.id ? `ID interno: \`${data.id}\`` : undefined,
        color: 0xd4af37,
        fields: [
          field("Nombre", data.name),
          field("Contacto", data.contact),
          field("Modalidad", data.mode),
          field("Experiencia", data.experience),
          field("Disponibilidad", data.availability.join(" · "), false),
          field("Le interesa", data.themes.join(" · "), false),
          ...(data.notes ? [field("Notas", data.notes, false)] : []),
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    // Timeout corto: si Discord tarda, no bloqueamos la respuesta al usuario.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}
