/**
 * Aviso instantáneo por webhook de Discord.
 *
 * Si una postulación cae en Postgres y nadie entra al panel en tres días, esa
 * persona ya se fue a otra mesa. El webhook te llega al celular en el momento.
 *
 * Cómo obtener la URL:
 *   Discord > Ajustes del canal > Integraciones > Webhooks > Nuevo webhook
 *
 * Si además no tenés DATABASE_URL, el webhook funciona como backend único.
 */

import {
  EXPERIENCIA,
  SISTEMA,
  TEMATICA,
  MODALIDAD,
  FRECUENCIA,
  DISPONIBILIDAD,
  LINEAS_ROJAS,
  ARCHETYPE_BY_ID,
  CAMPAIGN_BY_ID,
} from "@/data/ml-simulation-dataset";

export function isWebhookConfigured(): boolean {
  const url = process.env.DISCORD_WEBHOOK_URL ?? "";
  return (
    url.startsWith("https://discord.com/api/webhooks/") ||
    url.startsWith("https://discordapp.com/api/webhooks/")
  );
}

/** Traduce un valor interno a su etiqueta legible. */
function labelOf(list: ReadonlyArray<{ value: string; label: string }>, value: string): string {
  return list.find((o) => o.value === value)?.label ?? value;
}

function labelsOf(list: ReadonlyArray<{ value: string; label: string }>, values: string[]): string {
  if (values.length === 0) return "—";
  return values.map((v) => labelOf(list, v)).join(" · ");
}

type NotifyPayload = {
  id?: number | string | null;
  nombre: string;
  contacto: string;
  experiencia: string;
  sistema: string;
  tematicas: string[];
  modalidad: string;
  frecuencia: string;
  disponibilidad: string[];
  lineasRojas: string[];
  notas?: string | null;
  mlArchetype?: string | null;
  mlCampaign?: string | null;
};

function field(name: string, value: string, inline = true) {
  return { name: name.slice(0, 256), value: (value.trim() || "—").slice(0, 1024), inline };
}

export async function notifyDiscord(data: NotifyPayload): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url || !isWebhookConfigured()) return false;

  const archetype = data.mlArchetype ? ARCHETYPE_BY_ID.get(data.mlArchetype) : undefined;
  const campaign = data.mlCampaign ? CAMPAIGN_BY_ID.get(data.mlCampaign) : undefined;

  const fields = [
    field("Contacto", data.contacto),
    field("Experiencia", labelOf(EXPERIENCIA, data.experiencia)),
    field("Sistema", labelOf(SISTEMA, data.sistema)),
    field("Modalidad", labelOf(MODALIDAD, data.modalidad)),
    field("Frecuencia", labelOf(FRECUENCIA, data.frecuencia)),
    field("Temáticas", labelsOf(TEMATICA, data.tematicas), false),
    field("Disponibilidad", labelsOf(DISPONIBILIDAD, data.disponibilidad), false),
  ];

  // Las líneas rojas van destacadas: es lo que no hay que pasar por alto.
  if (data.lineasRojas.length > 0) {
    fields.push(field("⚠️ Líneas rojas", labelsOf(LINEAS_ROJAS, data.lineasRojas), false));
  }

  if (archetype) {
    fields.push(
      field("🧭 Arquetipo", `${archetype.name} — ${archetype.tagline}`, false),
      field("Consejo para el Master", archetype.masterTip, false),
    );
  }

  if (campaign) {
    fields.push(field("🎯 Campaña sugerida", campaign.name, false));
  }

  if (data.notas) fields.push(field("Notas", data.notas, false));

  const body = {
    username: "La Mesa Perdida",
    embeds: [
      {
        title: `🎲 ${data.nombre}`,
        description: data.id ? `ID interno: \`${data.id}\`` : undefined,
        color: 0xc9a227,
        // Discord corta en 25 campos; nunca llegamos, pero por las dudas.
        fields: fields.slice(0, 25),
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
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
