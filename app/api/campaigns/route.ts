import { NextResponse } from "next/server";
import { CAMPAIGNS } from "@/data/campaigns";

/**
 * Listado de campañas en JSON.
 *
 * Nota: la versión anterior importaba `CAMPAIGN_EXAMPLES`, que existía sólo
 * como alias al final de data/campaigns.ts. Funcionaba, pero eran dos nombres
 * para lo mismo. Se unificó en `CAMPAIGNS` y se eliminó el alias para que haya
 * una sola fuente de verdad.
 *
 * Las campañas son contenido estático (data/campaigns.ts), no salen de la DB:
 * son ejemplos editables a mano y no justifican una tabla.
 */

export const dynamic = "force-static";

export async function GET() {
  const rows = CAMPAIGNS.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    genre: c.genre,
    style: c.style,
    levelRange: c.levelRange,
    is_open: c.is_open,
    tags: c.tags ?? [],
  }));

  return NextResponse.json(rows);
}
