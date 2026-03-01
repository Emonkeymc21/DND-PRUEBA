import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const sql = db();
    const rows = await sql`
      select
        r.id,
        r.created_at,
        c.title as campaign_title,
        r.full_name,
        r.age,
        r.contact,
        r.country,
        r.availability,
        r.experience,
        r.desired_role,
        r.preferences,
        r.lines_veils,
        r.character_json_url,
        r.contacted
      from registrations r
      left join campaigns c on c.id = r.campaign_id
      order by r.created_at desc
      limit 500
    `;
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: "DB no configurada o inaccesible", detail: String(e?.message ?? e) }, { status: 500 });
  }
}

const PatchSchema = z.object({ id: z.number(), contacted: z.boolean() });

export async function PATCH(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    const sql = db();
    await sql`update registrations set contacted = ${parsed.data.contacted} where id = ${parsed.data.id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "No se pudo actualizar", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
