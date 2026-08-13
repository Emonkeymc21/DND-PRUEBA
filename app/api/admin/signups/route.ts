import { NextResponse } from "next/server";
import { z } from "zod";
import { db, isDbConfigured } from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json(
      {
        error: "Sin base de datos",
        detail: "No configuraste DATABASE_URL. Las postulaciones están llegando por Discord.",
      },
      { status: 503 },
    );
  }

  try {
    const sql = db();
    const rows = await sql`
      select
        id, created_at, nombre, contacto, experiencia, sistema, tematicas,
        modalidad, frecuencia, disponibilidad, lineas_rojas, notas,
        ml_tags, ml_vector, ml_archetype, ml_campaign,
        contactado, archivado, source
      from signups
      where archivado = false
      order by created_at desc
      limit 500
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error("[api/admin/signups] GET:", err);
    return NextResponse.json({ error: "No se pudo leer la base de datos." }, { status: 500 });
  }
}

const PatchSchema = z.object({
  id: z.number().int().positive(),
  contactado: z.boolean().optional(),
  archivado: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { id, contactado, archivado } = parsed.data;
  if (contactado === undefined && archivado === undefined) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  try {
    const sql = db();
    if (contactado !== undefined) {
      await sql`update signups set contactado = ${contactado} where id = ${id}`;
    }
    if (archivado !== undefined) {
      await sql`update signups set archivado = ${archivado} where id = ${id}`;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/signups] PATCH:", err);
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  }
}
