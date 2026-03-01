import { NextResponse } from "next/server";
import { srdList } from "@/lib/srd";

export async function GET() {
  try {
    const [races, classes, skills, spells] = await Promise.all([
      srdList("races"),
      srdList("classes"),
      srdList("skills"),
      srdList("spells")
    ]);

    // backgrounds en dnd5eapi puede variar; intentamos, si falla devolvemos []
    let backgrounds: any[] = [];
    try {
      backgrounds = await srdList("backgrounds");
    } catch {
      backgrounds = [];
    }

    return NextResponse.json({ races, classes, backgrounds, skills, spells });
  } catch (e: any) {
    return NextResponse.json({ error: "No se pudo cargar SRD", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
