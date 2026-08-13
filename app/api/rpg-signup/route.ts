import { NextResponse } from "next/server";
import { z } from "zod";
import { db, isDbConfigured } from "@/lib/db";
import { notifyDiscord, isWebhookConfigured } from "@/lib/notify";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  EXPERIENCIA_VALUES,
  SISTEMA_VALUES,
  TEMATICA_VALUES,
  MODALIDAD_VALUES,
  FRECUENCIA_VALUES,
  DISPONIBILIDAD_VALUES,
  LINEA_ROJA_VALUES,
  DIMENSIONS,
} from "@/data/ml-simulation-dataset";

/**
 * Endpoint público de postulación.
 *
 * Los enums de validación salen del mismo módulo que alimenta el formulario y
 * el motor de ML, así que no puede haber un valor válido en la interfaz que el
 * servidor rechace (ni al revés).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VectorSchema = z.object(
  Object.fromEntries(DIMENSIONS.map((d) => [d, z.number().min(0).max(1)])) as Record<
    (typeof DIMENSIONS)[number],
    z.ZodNumber
  >,
);

const Schema = z.object({
  nombre: z.string().trim().min(2, "Nombre muy corto").max(80),
  contacto: z.string().trim().min(3, "Contacto muy corto").max(120),

  experiencia: z.enum(EXPERIENCIA_VALUES),
  sistema: z.enum(SISTEMA_VALUES).default("indistinto"),
  tematicas: z.array(z.enum(TEMATICA_VALUES)).max(8).default([]),
  modalidad: z.enum(MODALIDAD_VALUES).default("indistinto"),
  frecuencia: z.enum(FRECUENCIA_VALUES).default("quincenal"),
  disponibilidad: z.array(z.enum(DISPONIBILIDAD_VALUES)).max(8).default([]),
  lineasRojas: z.array(z.enum(LINEA_ROJA_VALUES)).max(10).default([]),
  notas: z.string().trim().max(600).optional().or(z.literal("")),

  // Metadata del modelo
  mlTags: z.array(z.string().max(40)).max(14).default([]),
  mlVector: VectorSchema.nullish(),
  mlArchetype: z.string().max(40).nullish(),
  mlCampaign: z.string().max(40).nullish(),

  source: z.string().trim().max(60).optional(),

  // Anti-bot
  website: z.string().max(200).optional(),
  elapsedMs: z.number().int().nonnegative().optional(),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`signup:${ip}`, 5, 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Demasiados envíos seguidos. Esperá un minuto y probá de nuevo." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: first?.message ?? "Revisá los datos del formulario.", field: first?.path?.[0] },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Honeypot: respondemos ok para que el bot no aprenda que lo detectamos.
  if (data.website && data.website.trim().length > 0) {
    return NextResponse.json({ ok: true, id: null });
  }
  if (typeof data.elapsedMs === "number" && data.elapsedMs < 3000) {
    return NextResponse.json({ ok: true, id: null });
  }

  const hasDb = isDbConfigured();
  const hasWebhook = isWebhookConfigured();

  if (!hasDb && !hasWebhook) {
    return NextResponse.json(
      {
        ok: false,
        code: "NO_BACKEND",
        error:
          "El formulario todavía no está conectado. Configurá DATABASE_URL o DISCORD_WEBHOOK_URL.",
      },
      { status: 503 },
    );
  }

  const notas = data.notas && data.notas.length > 0 ? data.notas : null;
  let savedId: number | null = null;

  if (hasDb) {
    try {
      const sql = db();

      // Deduplicación: mismo contacto en la última hora = doble click.
      const dupes = await sql<{ id: number }[]>`
        select id from signups
        where lower(contacto) = lower(${data.contacto})
          and created_at > now() - interval '1 hour'
        limit 1
      `;

      if (dupes.length > 0) {
        return NextResponse.json({ ok: true, id: dupes[0]!.id, duplicate: true });
      }

      const rows = await sql<{ id: number }[]>`
        insert into signups (
          nombre, contacto, experiencia, sistema, tematicas, modalidad, frecuencia,
          disponibilidad, lineas_rojas, notas,
          ml_tags, ml_vector, ml_archetype, ml_campaign, source
        ) values (
          ${data.nombre},
          ${data.contacto},
          ${data.experiencia},
          ${data.sistema},
          ${data.tematicas},
          ${data.modalidad},
          ${data.frecuencia},
          ${data.disponibilidad},
          ${data.lineasRojas},
          ${notas},
          ${data.mlTags},
          ${data.mlVector ? JSON.stringify(data.mlVector) : null},
          ${data.mlArchetype ?? null},
          ${data.mlCampaign ?? null},
          ${data.source ?? null}
        )
        returning id
      `;

      savedId = rows[0]?.id ?? null;
    } catch (err) {
      console.error("[api/rpg-signup] error de DB:", err);
      if (!hasWebhook) {
        return NextResponse.json(
          { ok: false, code: "DB_ERROR", error: "No pudimos guardar tu postulación. Probá de nuevo." },
          { status: 500 },
        );
      }
    }
  }

  const notified = await notifyDiscord({
    id: savedId,
    nombre: data.nombre,
    contacto: data.contacto,
    experiencia: data.experiencia,
    sistema: data.sistema,
    tematicas: data.tematicas,
    modalidad: data.modalidad,
    frecuencia: data.frecuencia,
    disponibilidad: data.disponibilidad,
    lineasRojas: data.lineasRojas,
    notas,
    mlArchetype: data.mlArchetype ?? null,
    mlCampaign: data.mlCampaign ?? null,
  });

  if (savedId === null && !notified) {
    return NextResponse.json(
      { ok: false, code: "DELIVERY_FAILED", error: "No pudimos registrar tu postulación." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: savedId });
}
