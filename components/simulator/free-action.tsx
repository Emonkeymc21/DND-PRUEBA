"use client";

import * as React from "react";
import { D20, type RollResult } from "@/components/dice/d20";
import type { TraitDelta } from "@/lib/traits";

/**
 * Entrada de texto libre del simulador.
 *
 * Flujo de un turno:
 *   1. La persona escribe lo que quiere hacer.
 *   2. El servidor (IA o heurístico) narra el intento y fija una dificultad.
 *   3. Aparece el d20: la tirada decide si el intento sale o no.
 *   4. El resultado se manda al simulador, que aplica el perfil y sigue.
 *
 * La narración nunca dice "lo lográs": eso lo define el dado. Así el texto
 * libre no se convierte en "escribo que gano y gano".
 */

type TurnResponse = {
  narration: string;
  delta: TraitDelta;
  dc: number;
  tag: string;
  ai: boolean;
};

type Props = {
  sceneTitle: string;
  sceneText: string;
  theme: string;
  history: string[];
  onResolved: (payload: {
    action: string;
    narration: string;
    delta: TraitDelta;
    roll: RollResult;
    ai: boolean;
  }) => void;
};

type Stage =
  | { name: "input" }
  | { name: "thinking" }
  | { name: "roll"; turn: TurnResponse; action: string }
  | { name: "error"; message: string };

const MAX = 400;

const SUGERENCIAS = [
  "Reviso el lugar antes de moverme",
  "Le hablo y trato de ganar tiempo",
  "Uso lo que tengo a mano de forma inesperada",
  "Aviso al grupo y vamos juntos",
];

export function FreeAction({ sceneTitle, sceneText, theme, history, onResolved }: Props) {
  const [text, setText] = React.useState("");
  const [stage, setStage] = React.useState<Stage>({ name: "input" });
  const taRef = React.useRef<HTMLTextAreaElement | null>(null);

  const send = React.useCallback(
    async (action: string) => {
      const clean = action.trim();
      if (clean.length < 2) return;

      setStage({ name: "thinking" });

      try {
        const res = await fetch("/api/simulator/turn", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: clean,
            sceneTitle,
            sceneText,
            theme,
            history: history.slice(-6),
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setStage({ name: "error", message: data?.error ?? "No pude procesar tu acción." });
          return;
        }

        setStage({ name: "roll", turn: data as TurnResponse, action: clean });
      } catch {
        setStage({ name: "error", message: "Se cortó la conexión. Probá de nuevo." });
      }
    },
    [sceneTitle, sceneText, theme, history],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envía, Shift+Enter hace salto de línea.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(text);
    }
  }

  function handleRoll(roll: RollResult) {
    if (stage.name !== "roll") return;
    const { turn, action } = stage;

    onResolved({ action, narration: turn.narration, delta: turn.delta, roll, ai: turn.ai });

    setText("");
    setStage({ name: "input" });
  }

  // --- Pensando ---
  if (stage.name === "thinking") {
    return (
      <div className="rounded-2xl border border-border/70 bg-surface/60 p-6">
        <div className="flex items-center gap-3">
          <span className="flex gap-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: `${i * 140}ms` }}
              />
            ))}
          </span>
          <span className="text-sm text-muted">El DM está pensando…</span>
        </div>
      </div>
    );
  }

  // --- Narración + tirada ---
  if (stage.name === "roll") {
    return (
      <div className="space-y-4 rounded-2xl border border-primary/35 bg-surface/60 p-5">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">El DM narra</span>
            {!stage.turn.ai ? (
              <span
                className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted"
                title="Sin API key configurada: narración generada por el evaluador local"
              >
                modo local
              </span>
            ) : null}
          </div>
          <p className="text-[15px] leading-relaxed text-text/90">{stage.turn.narration}</p>
        </div>

        <div className="border-t border-border/60 pt-4">
          <p className="mb-3 text-center text-sm text-muted">
            Tirá para ver si te sale.
          </p>
          <D20 dc={stage.turn.dc} onResult={handleRoll} />
        </div>
      </div>
    );
  }

  // --- Error ---
  if (stage.name === "error") {
    return (
      <div className="space-y-3 rounded-2xl border border-ember/50 bg-ember/10 p-5">
        <p className="text-sm text-text/90">{stage.message}</p>
        <button
          type="button"
          onClick={() => setStage({ name: "input" })}
          className="rounded-xl border border-border/70 px-4 py-2 text-sm font-semibold text-text/85 hover:border-primary/70 hover:text-primary"
        >
          Volver a intentar
        </button>
      </div>
    );
  }

  // --- Entrada ---
  const left = MAX - text.length;

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-surface/50 p-5">
      <div>
        <label htmlFor="free-action" className="text-xs font-semibold uppercase tracking-widest text-primary">
          O escribí lo que se te ocurra
        </label>
        <p className="mt-1 text-xs text-muted">
          No hay respuestas incorrectas. Probá algo que no esté en la lista.
        </p>
      </div>

      <textarea
        id="free-action"
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX))}
        onKeyDown={onKeyDown}
        rows={3}
        placeholder="Ej: agarro la antorcha y la tiro hacia el charco de aceite…"
        className="w-full resize-y rounded-xl border border-border/70 bg-bg/70 px-4 py-3 text-base text-text outline-none transition placeholder:text-muted/60 focus:border-primary/70"
      />

      <div className="flex flex-wrap gap-2">
        {SUGERENCIAS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setText(s);
              taRef.current?.focus();
            }}
            className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted transition hover:border-primary/60 hover:text-primary"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs ${left < 40 ? "text-ember" : "text-muted"}`}>{left} caracteres</span>
        <button
          type="button"
          onClick={() => void send(text)}
          disabled={text.trim().length < 2}
          className="rounded-xl border border-transparent bg-gradient-to-b from-primary to-primary-deep px-5 py-2.5 text-sm font-bold text-[rgb(12,10,16)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Hacer esto
        </button>
      </div>
    </div>
  );
}

export default FreeAction;
