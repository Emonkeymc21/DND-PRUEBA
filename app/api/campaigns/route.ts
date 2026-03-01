import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const sql = db();
    const rows = await sql`
      select id, slug, title, description, is_open
      from campaigns
      order by created_at desc
    `;
    return NextResponse.json(rows);
  } catch (e: any) {
    return NextResponse.json({ error: "DB no configurada o inaccesible", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
