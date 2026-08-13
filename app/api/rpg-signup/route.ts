import { NextResponse } from "next/server";
import { z } from "zod";
import { submitToGoogleForms, isGoogleFormsConfigured } from "@/lib/google-forms";
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
 * Sin base de datos: cada postulación se manda en paralelo a dos canales
 * independientes, Google Forms (server-to-server, sin el problema de CORS que
 * tenía el POST desde el navegador) y el webhook de Discord. Alcanza con que
 * UNO de los dos confirme para considerar la postulación entregada.
 *
 * Si los dos fallan (sin conexión a Google, sin webhook configurado, error de
 * red), igual respondemos 200: el cliente (components/form/SignupForm.tsx)
 * guarda la postulación en una cola local y la reintenta sola más tarde, sin
 * mostrarle a la persona ningún cartel de error. Ver lib/signup-backup.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  mlTags: z.array(z.string().max(40)).max(14).default([]),
  mlVector: z
    .object(
      Object.fromEntries(DIMENSIONS.map((d) => [d, z.number().min(0).max(1)])) as Record<
        (typeof DIMENSIONS)[number],
        z.ZodNumber
      >,
    )
    .nullish(),
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
    return NextResponse.json({ ok: true });
  }
  if (typeof data.elapsedMs === "number" && data.elapsedMs < 3000) {
    return NextResponse.json({ ok: true });
  }

  const notas = data.notas && data.notas.length > 0 ? data.notas : null;

  const fields = {
    nombre: data.nombre,
    contacto: data.contacto,
    experiencia: data.experiencia,
    sistema: data.sistema,
    tematicas: data.tematicas,
    modalidad: data.modalidad,
    frecuencia: data.frecuencia,
    disponibilidad: data.disponibilidad,
    lineasRojas: data.lineasRojas,
  };

  // Los dos canales van en paralelo: no tiene sentido esperar a que uno
  // termine para recién empezar el otro.
  const [formsOk, discordOk] = await Promise.all([
    submitToGoogleForms(fields),
    notifyDiscord({
      ...fields,
      notas,
      mlArchetype: data.mlArchetype ?? null,
      mlCampaign: data.mlCampaign ?? null,
    }),
  ]);

  const delivered = formsOk || discordOk;

  // Si NINGÚN canal está siquiera configurado, se lo decimos con calma en la
  // respuesta (no es un error del envío, es que el sitio no tiene destino
  // todavía) — pero igual devolvemos ok:true, porque el cliente lo va a
  // guardar en su cola local y no hay ninguna razón para alarmar a la
  // persona que se está postulando por una configuración que no depende
  // de ella.
  return NextResponse.json({
    ok: true,
    delivered,
    channels: {
      googleForms: formsOk,
      discord: discordOk,
    },
    configured: isGoogleFormsConfigured() || isWebhookConfigured(),
  });
}
