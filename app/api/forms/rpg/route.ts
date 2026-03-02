import { NextResponse } from "next/server";

const DEFAULT_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLScP2cSEbMdsVes4w8f1frB9hZSwP7xFsXjaY_Smm6AcGJsq3A/formResponse";

/**
 * Proxy server-side hacia Google Forms.
 * - Evita CORS / bloqueos del navegador.
 * - Mantiene el comportamiento del index original (entry.x y emailAddress).
 */
export async function POST(req: Request) {
  try {
    const action = process.env.GOOGLE_FORM_ACTION ?? DEFAULT_ACTION;

    // Acepta FormData enviado desde el cliente (name="entry.XXXX")
    const fd = await req.formData();
    const params = new URLSearchParams();

    for (const [key, value] of fd.entries()) {
      if (typeof value === "string") {
        if (value.trim().length) params.append(key, value);
      }
      // (No esperamos archivos)
    }

    const res = await fetch(action, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: params.toString(),
    });

    return NextResponse.json({ ok: true, status: res.status }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
