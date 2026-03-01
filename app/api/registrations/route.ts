import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const Schema = z.object({
  campaignId: z.number(),
  fullName: z.string().min(3).max(120),
  age: z.number().int().min(0).max(120).optional(),
  contact: z.string().min(3).max(120),
  country: z.string().min(2).max(80),
  availability: z.string().min(2).max(200),
  experience: z.enum(["nuevo", "intermedio", "avanzado"]),
  desiredRole: z.enum(["jugador", "dm", "flexible"]),
  preferences: z.string().min(3).max(400),
  linesVeils: z.string().max(600).optional(),
  characterJsonUrl: z.string().url().optional()
});

const buckets = new Map<string, { ts: number; count: number }>();
function rateLimit(ip: string) {
  const now = Date.now();
  const win = 60_000; // 1 min
  const max = 5;
  const cur = buckets.get(ip);
  if (!cur || now - cur.ts > win) {
    buckets.set(ip, { ts: now, count: 1 });
    return true;
  }
  if (cur.count >= max) return false;
  cur.count += 1;
  buckets.set(ip, cur);
  return true;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  if (!rateLimit(ip)) return NextResponse.json({ error: "Demasiadas solicitudes. Probá de nuevo en 1 minuto." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const data = parsed.data;

  try {
    const sql = db();
    const rows = await sql`
      insert into registrations (
        campaign_id, full_name, age, contact, country, availability,
        experience, desired_role, preferences, lines_veils, character_json_url
      )
      values (
        ${data.campaignId},
        ${data.fullName},
        ${data.age ?? null},
        ${data.contact},
        ${data.country},
        ${data.availability},
        ${data.experience},
        ${data.desiredRole},
        ${data.preferences},
        ${data.linesVeils ?? null},
        ${data.characterJsonUrl ?? null}
      )
      returning id
    `;
    return NextResponse.json({ ok: true, id: rows[0]?.id });
  } catch (e: any) {
    return NextResponse.json({ error: "No se pudo guardar (DB)", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
