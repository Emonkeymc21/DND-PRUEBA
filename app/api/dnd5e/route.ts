import { NextResponse } from "next/server";

/**
 * Proxy cacheado de la D&D 5e API (https://www.dnd5eapi.co).
 *
 * Es gratuita, abierta y sirve contenido del SRD 5.1 bajo licencia OGL, así que
 * se puede usar sin problemas de derechos.
 *
 * Por qué proxy en vez de llamarla desde el navegador:
 * - Cacheamos del lado del servidor (revalidate 24h): los monstruos del SRD no
 *   cambian nunca, y así no le pegamos a un servicio comunitario gratis en cada
 *   carga de página.
 * - Whitelist de recursos: nadie puede usar nuestro dominio para pedir
 *   cualquier URL arbitraria (eso sería un open proxy).
 * - Si el servicio se cae, respondemos con un error controlado en vez de que se
 *   rompa la UI.
 */

export const runtime = "nodejs";
export const revalidate = 86_400; // 24 horas

const BASE = "https://www.dnd5eapi.co/api";

/** Sólo estos recursos. Nada de pasar rutas libres. */
const ALLOWED = new Set(["monsters", "spells", "classes", "races", "conditions", "magic-items"]);

const SLUG_RE = /^[a-z0-9-]{1,60}$/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const resource = (searchParams.get("resource") ?? "monsters").toLowerCase();
  const index = searchParams.get("index");

  if (!ALLOWED.has(resource)) {
    return NextResponse.json(
      { error: "Recurso no permitido.", allowed: [...ALLOWED] },
      { status: 400 },
    );
  }

  if (index !== null && !SLUG_RE.test(index)) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  const url = index ? `${BASE}/${resource}/${index}` : `${BASE}/${resource}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      next: { revalidate },
    });

    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json(
        { error: "La API de D&D 5e no respondió correctamente." },
        { status: res.status === 404 ? 404 : 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo contactar la API de D&D 5e. Probá de nuevo en un rato." },
      { status: 504 },
    );
  }
}
