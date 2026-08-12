import { NextResponse } from "next/server";
import { z } from "zod";
import { db, isDbConfigured } from "@/lib/db";
import { notifyDiscord, isWebhookConfigured } from "@/lib/notify";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Endpoint público de postulación.
 *
 * Reemplaza al POST directo contra Google Forms con iframe oculto, que fallaba
 * silenciosamente: Google bloquea el framing de /formResponse, el evento load
 * del iframe no dispara de forma confiable y con la partición de cookies de
 * terceros de Chrome/Safari directamente no llega nada. El usuario veía
 * "timeout" (o peor: "enviado" sin que se guardara nada).
 *
 * Ahora el navegador habla solo con nuestro propio servidor y recibe una
 * respuesta real: si dice ok, está guardado de verdad.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(80),
  contact: z.string().trim().min(3, "Contacto muy corto").max(120),
  experience: z.enum(["nuevo", "poco", "bastante", "dm"]),
  mode: z.enum(["online", "presencial", "indistinto"]),
  availability: z.array(z.string().max(40)).max(12).default([]),
  themes: z.array(z.string().max(40)).max(12).default([]),
  notes: z.string().trim().max(600).optional().or(z.literal("")),
  quizTags: z.array(z.string().max(30)).max(10).default([]),
  source: z.string().trim().max(60).optional(),

  // Anti-bot (no se guardan)
  website: z.string().max(200).optional(), // honeypot: debe venir vacío
  elapsedMs: z.number().int().nonnegative().optional(),
});

export async function POST(req: Request) {
  // ---- 1. Anti-abuso barato -------------------------------------------------
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

  // Honeypot: un campo invisible que sólo un bot completa.
  // Respondemos ok para que el bot no aprenda que lo detectamos.
  if (data.website && data.website.trim().length > 0) {
    return NextResponse.json({ ok: true, id: null });
  }

  // Ningún humano llena este formulario en menos de 3 segundos.
  if (typeof data.elapsedMs === "number" && data.elapsedMs < 3000) {
    return NextResponse.json({ ok: true, id: null });
  }

  // ---- 2. ¿Hay algún backend configurado? ----------------------------------
  const hasDb = isDbConfigured();
  const hasWebhook = isWebhookConfigured();

  if (!hasDb && !hasWebhook) {
    return NextResponse.json(
      {
        ok: false,
        code: "NO_BACKEND",
        error:
          "El formulario todavía no está conectado. Configurá DATABASE_URL o DISCORD_WEBHOOK_URL en las variables de entorno.",
      },
      { status: 503 },
    );
  }

  const notes = data.notes && data.notes.length > 0 ? data.notes : null;
  let savedId: number | null = null;

  // ---- 3. Guardar en Postgres ----------------------------------------------
  if (hasDb) {
    try {
      const sql = db();

      // Deduplicación: mismo contacto en la última hora = doble click o recarga.
      const dupes = await sql<{ id: number }[]>`
        select id
        from signups
        where lower(contact) = lower(${data.contact})
          and created_at > now() - interval '1 hour'
        limit 1
      `;

      if (dupes.length > 0) {
        return NextResponse.json({ ok: true, id: dupes[0]!.id, duplicate: true });
      }

      const rows = await sql<{ id: number }[]>`
        insert into signups (
          name, contact, experience, mode, availability, themes, notes, quiz_tags, source
        ) values (
          ${data.name},
          ${data.contact},
          ${data.experience},
          ${data.mode},
          ${data.availability},
          ${data.themes},
          ${notes},
          ${data.quizTags},
          ${data.source ?? null}
        )
        returning id
      `;

      savedId = rows[0]?.id ?? null;
    } catch (err) {
      console.error("[api/rpg-signup] error de DB:", err);

      // Si la DB falla pero hay webhook, no perdemos la postulación.
      if (!hasWebhook) {
        return NextResponse.json(
          { ok: false, code: "DB_ERROR", error: "No pudimos guardar tu postulación. Probá de nuevo en un minuto." },
          { status: 500 },
        );
      }
    }
  }

  // ---- 4. Avisar por Discord (no bloquea el resultado) ----------------------
  const notified = await notifyDiscord({
    id: savedId,
    name: data.name,
    contact: data.contact,
    mode: data.mode,
    experience: data.experience,
    availability: data.availability,
    themes: data.themes,
    notes,
  });

  if (savedId === null && !notified) {
    return NextResponse.json(
      { ok: false, code: "DELIVERY_FAILED", error: "No pudimos registrar tu postulación. Probá de nuevo." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: savedId });
}
