import { NextResponse } from "next/server";
import { z } from "zod";
import { setAdminCookie } from "@/lib/auth";

const Schema = z.object({ password: z.string().min(1) });

export async function POST(req: Request) {
  const pass = process.env.ADMIN_PASSWORD ?? "Monkey1021*";
  
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  if (parsed.data.password !== pass) return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });

  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
