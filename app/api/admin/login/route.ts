import { NextResponse } from "next/server";
import { z } from "zod";
import { setAdminCookie, checkPassword } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({ password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  // Freno a la fuerza bruta: 8 intentos por IP cada 5 minutos.
  if (!rateLimit(`login:${clientIp(req)}`, 8, 5 * 60_000)) {
    return NextResponse.json({ error: "Demasiados intentos. Esperá unos minutos." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  if (!checkPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
