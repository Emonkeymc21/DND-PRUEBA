import { NextResponse } from "next/server";
import { CAMPAIGN_EXAMPLES } from "@/data/campaigns";

export async function GET() {
  const rows = CAMPAIGN_EXAMPLES.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    is_open: c.is_open
  }));
  return NextResponse.json(rows);
}
