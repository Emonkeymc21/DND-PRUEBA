import { NextResponse } from "next/server";
import { z } from "zod";
import { generateTurn, activeProvider } from "@/lib/ai/providers";
import { evaluateHeuristic } from "@/lib/ai/heuristic";
import { sanitizeTraitDelta, type TraitDelta } from "@/lib/traits";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Un turno de texto libre en el simulador.
 *
 * Entra lo que el jugador escribió + la escena; sale la narración adaptada,
 * el movimiento del perfil y la dificultad de la tirada.
 *
 * Diseño clave: si no hay API key, o si el proveedor falla, o si devuelve algo
 * que no parsea, SIEMPRE cae al evaluador heurístico. El simulador nunca se
 * rompe por culpa de la IA; en el peor caso es menos inteligente.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  action: z.string().trim().min(2, "Escribí un poco más.").max(400, "Máximo 400 caracteres."),
  sceneTitle: z.string().max(160).default(""),
  sceneText: z.string().max(2000).default(""),
  theme: z.string().max(40).default("fantasía"),
  history: z.array(z.string().max(300)).max(20).default([]),
});

export type TurnResponse = {
  narration: string;
  delta: TraitDelta;
  dc: number;
  tag: string;
  /** true si la narración salió de un LLM; false si vino del heurístico. */
  ai: boolean;
};

export async function POST(req: Request) {
  // La IA cuesta plata por request: 20 turnos por minuto y por IP alcanza de
  // sobra para jugar y frena a cualquiera que quiera hacer de esto su API.
  if (!rateLimit(`sim:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "Estás yendo muy rápido. Esperá unos segundos." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const { action, sceneTitle, sceneText, theme, history } = parsed.data;

  // Camino 1: el LLM, si está configurado.
  if (activeProvider() !== "none") {
    const ai = await generateTurn({
      playerAction: action,
      sceneTitle,
      sceneText,
      theme,
      history,
    });

    if (ai) {
      const payload: TurnResponse = {
        narration: ai.narration.slice(0, 700),
        delta: sanitizeTraitDelta(ai.delta),
        dc: Math.min(18, Math.max(8, Math.round(ai.dc))),
        tag: ai.tag.slice(0, 20),
        ai: true,
      };
      return NextResponse.json(payload);
    }
  }

  // Camino 2: respaldo determinista.
  const h = evaluateHeuristic(action, sceneTitle);
  const payload: TurnResponse = {
    narration: h.narration,
    delta: sanitizeTraitDelta(h.delta),
    dc: h.dc,
    tag: h.kind,
    ai: false,
  };

  return NextResponse.json(payload);
}
