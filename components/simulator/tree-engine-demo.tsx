"use client";

import * as React from "react";
import { Card, Button } from "@/components/ui";
import { Dice3D, type RollResult } from "@/components/dice/dice3d";
import { Typewriter } from "@/components/simulator/narration";

/**
 * Demo del motor híbrido Python/TypeScript (v7).
 *
 * Cada acción de texto libre pega a /api/simulate, que intenta el servicio
 * FastAPI local (ml_service/, puerto 8000) y cae automáticamente al motor
 * TypeScript equivalente si no está corriendo. La etiqueta "motor: python" o
 * "motor: typescript" en la esquina muestra cuál respondió — así podés
 * confirmar que el fallback funciona apagando el servicio Python a mitad de
 * partida.
 *
 * Al terminar (nodo con `end: true`) se dispara una tirada de d20 real: el
 * resultado se emite como evento hacia este componente vía onResult, tal como
 * pide la especificación.
 */

type NextNode = {
  id: string;
  title: string;
  text: string;
  end: boolean;
  archetypeResult: string | null;
  options: Array<{ id: string; label: string }>;
};

type ArchetypeResult = {
  id: string | null;
  info: { tagline: string; description: string; suggested_class: string; master_tip: string } | null;
  scores: Record<string, number>;
};

type SimulateResponse = {
  ok: boolean;
  matched: boolean;
  similarity: number;
  chosenOption?: string | null;
  consequence?: string | null;
  nextNode?: NextNode | null;
  accumulatedWeights: Record<string, number>;
  archetype?: ArchetypeResult | null;
  message?: string | null;
  availableOptions?: string[];
  engine: "python" | "typescript";
  error?: string;
};

const ROOT_TITLE = "La Puerta de Piedra Vieja";
const ROOT_TEXT =
  "Frente a vos hay una puerta de piedra cubierta de musgo, con runas que ya nadie lee. El resto del grupo espera tu decisión.";

export function TreeEngineDemo() {
  const [nodeId, setNodeId] = React.useState("root");
  const [title, setTitle] = React.useState(ROOT_TITLE);
  const [text, setText] = React.useState(ROOT_TEXT);
  const [ended, setEnded] = React.useState(false);

  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [notMatched, setNotMatched] = React.useState<string | null>(null);
  const [consequence, setConsequence] = React.useState<string | null>(null);
  const [weights, setWeights] = React.useState<Record<string, number>>({});
  const [archetype, setArchetype] = React.useState<ArchetypeResult | null>(null);
  const [finalRoll, setFinalRoll] = React.useState<RollResult | null>(null);

  async function send() {
    const action = input.trim();
    if (action.length < 2 || busy) return;

    setBusy(true);
    setNotMatched(null);
    setConsequence(null);

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nodeId, text: action, accumulatedWeights: weights }),
      });

      const data = (await res.json()) as SimulateResponse;

      if (!data.ok) {
        setNotMatched(data.error ?? "Error del motor narrativo.");
        return;
      }

      if (!data.matched) {
        setNotMatched(data.message ?? "No reconocí esa acción.");
        return;
      }

      setConsequence(data.consequence ?? null);
      setWeights(data.accumulatedWeights ?? {});
      setArchetype(data.archetype ?? null);

      if (data.nextNode) {
        setNodeId(data.nextNode.id);
        setTitle(data.nextNode.title);
        setText(data.nextNode.text);
        setEnded(data.nextNode.end);
      }

      setInput("");
    } catch {
      setNotMatched("Se cortó la conexión. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setNodeId("root");
    setTitle(ROOT_TITLE);
    setText(ROOT_TEXT);
    setEnded(false);
    setInput("");
    setNotMatched(null);
    setConsequence(null);
    setWeights({});
    setArchetype(null);
    setFinalRoll(null);
  }

  return (
    <div className="space-y-4">
      <Card className="edge-top">
        <h2 className="font-display text-xl font-bold text-primary">{title}</h2>
        <Typewriter key={nodeId} text={text} className="mt-2 text-[15px] leading-relaxed text-text/85" />

        {consequence ? (
          <p className="mt-3 rounded-xl border border-border/60 bg-surface/60 p-3 text-sm italic text-text/80">
            {consequence}
          </p>
        ) : null}

        {!ended ? (
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 200))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void send();
                }}
                placeholder="Escribí qué hace tu personaje…"
                className="flex-1 rounded-xl border border-border/70 bg-bg/70 px-4 py-3 text-base text-text outline-none transition placeholder:text-muted/60 focus:border-primary/70"
              />
              <Button type="button" onClick={() => void send()} disabled={busy || input.trim().length < 2}>
                {busy ? "…" : "Actuar"}
              </Button>
            </div>

            {notMatched ? (
              <p className="text-xs text-ember">{notMatched}</p>
            ) : (
              <p className="text-xs text-muted">
                Probá algo como "forzar la puerta", "leer las runas" o "avisar al grupo".
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                Perfil final
              </div>

              {archetype?.info ? (
                <>
                  <div className="mt-1 font-display text-lg font-bold text-text">{archetype.id}</div>
                  <p className="text-sm italic text-text/80">{archetype.info.tagline}</p>
                  <p className="mt-2 text-sm text-text/75">{archetype.info.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-primary/50 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      Clase: {archetype.info.suggested_class}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">Sin suficientes datos para un arquetipo claro.</p>
              )}

              <div className="mt-4 border-t border-border/50 pt-4">
                <p className="mb-2 text-center text-sm text-muted">
                  Tirada de cierre: el resultado se emite como evento hacia este componente.
                </p>
                <div className="flex justify-center">
                  <Dice3D size={170} onResult={(r) => setFinalRoll(r)} />
                </div>
                {finalRoll ? (
                  <p className="mt-2 text-center text-xs text-muted">
                    Evento recibido: tirada = {finalRoll.roll}
                    {finalRoll.crit ? " (¡crítico!)" : finalRoll.fumble ? " (pifia)" : ""}
                  </p>
                ) : null}
              </div>
            </div>

            <Button variant="ghost" className="w-full" onClick={restart}>
              🔁 Empezar de nuevo
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default TreeEngineDemo;
