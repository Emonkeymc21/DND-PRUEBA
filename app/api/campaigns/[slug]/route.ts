import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const sql = db();
    const rows = await sql`
      select id, slug, title, description, is_open
      from campaigns
      where slug = ${slug}
      limit 1
    `;
    const campaign = rows[0];
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(campaign);
  } catch (e: any) {
    return NextResponse.json({ error: "DB no configurada o inaccesible", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
