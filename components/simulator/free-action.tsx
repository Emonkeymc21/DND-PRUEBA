"use client";

import * as React from "react";
import { Dice3D, type RollResult } from "@/components/dice/dice3d";
import { Typewriter } from "@/components/simulator/narration";
import type { Vector } from "@/data/ml-simulation-dataset";
import type { MlArchetype, MlCampaign } from "@/components/simulator/profile-panel";

/**
 * Turno de texto libre.
 *
 * Encadena las dos capas del sistema:
 *   1. /api/ml/classify  → vectoriza el texto, actualiza el perfil, rankea campañas.
 *   2. /api/simulator/turn → narración adaptada (LLM si hay key, heurístico si no).
 *
 * Van en paralelo con Promise.all: son independientes y así el turno tarda lo
 * que tarda la más lenta, no la suma de las dos.
 *
 * El dado decide el desenlace. La narración describe el INTENTO: si dijera
 * "lo lográs", escribir "gano" sería ganar.
 */

export type TurnPayload = {
  action: string;
  narration: string;
  roll: RollResult;
  turnVector: Vector | null;
  profile: Vector;
  archetype: MlArchetype | null;
  campaigns: MlCampaign[];
  confidence: number | null;
  ai: boolean;
};

type Props = {
  sceneTitle: string;
  sceneText: string;
  theme: string;
  history: string[];
  vectorHistory: Vector[];
  experiencia?: string | null;
  lineasRojas?: string[];
  onResolved: (payload: TurnPayload) => void;
};

type ClassifyResponse = {
  turnVector: Vector | null;
  profile: Vector;
  confidence: number | null;
  archetype: MlArchetype | null;
  campaigns: MlCampaign[];
};

type TurnResponse = {
  narration: string;
  dc: number;
  tag: string;
  ai: boolean;
};

type Stage =
  | { name: "input" }
  | { name: "thinking" }
  | { name: "roll"; turn: TurnResponse; ml: ClassifyResponse; action: string }
  | { name: "error"; message: string };

const MAX = 400;

const SUGERENCIAS = [
  "Reviso todo antes de moverme",
  "Le hablo y trato de ganar tiempo",
  "Uso lo que tengo a mano de forma inesperada",
  "Aviso al grupo y vamos juntos",
];

export function FreeAction({
  sceneTitle,
  sceneText,
  theme,
  history,
  vectorHistory,
  experiencia,
  lineasRojas = [],
  onResolved,
}: Props) {
  const [text, setText] = React.useState("");
  const [stage, setStage] = React.useState<Stage>({ name: "input" });
  const taRef = React.useRef<HTMLTextAreaElement | null>(null);

  const send = React.useCallback(
    async (action: string) => {
      const clean = action.trim();
      if (clean.length < 2) return;

      setStage({ name: "thinking" });

      try {
        const [mlRes, turnRes] = await Promise.all([
          fetch("/api/ml/classify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              text: clean,
              history: vectorHistory,
              experiencia: experiencia ?? null,
              lineasRojas,
            }),
          }),
          fetch("/api/simulator/turn", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action: clean,
              sceneTitle,
              sceneText,
              theme,
              history: history.slice(-6),
            }),
          }),
        ]);

        if (!turnRes.ok) {
          const err = await turnRes.json().catch(() => ({}));
          setStage({ name: "error", message: err?.error ?? "No pude procesar tu acción." });
          return;
        }

        const turn = (await turnRes.json()) as TurnResponse;

        // Si el clasificador falla, el turno igual sigue: el perfil es un extra,
        // no un requisito para jugar.
        const ml: ClassifyResponse = mlRes.ok
          ? ((await mlRes.json()) as ClassifyResponse)
          : {
              turnVector: null,
              profile: vectorHistory[vectorHistory.length - 1] ?? ({} as Vector),
              confidence: null,
              archetype: null,
              campaigns: [],
            };

        setStage({ name: "roll", turn, ml, action: clean });
      } catch {
        setStage({ name: "error", message: "Se cortó la conexión. Probá de nuevo." });
      }
    },
    [sceneTitle, sceneText, theme, history, vectorHistory, experiencia, lineasRojas],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(text);
    }
  }

  function handleRoll(roll: RollResult) {
    if (stage.name !== "roll") return;
    const { turn, ml, action } = stage;

    onResolved({
      action,
      narration: turn.narration,
      roll,
      turnVector: ml.turnVector,
      profile: ml.profile,
      archetype: ml.archetype,
      campaigns: ml.campaigns,
      confidence: ml.confidence,
      ai: turn.ai,
    });

    setText("");
    setStage({ name: "input" });
  }

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

  if (stage.name === "roll") {
    return (
      <div className="space-y-4 rounded-2xl border border-primary/35 bg-surface/60 p-5">
        <div>
          <div className="mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">El DM narra</span>
          </div>
          <Typewriter
            text={stage.turn.narration}
            className="text-[15px] leading-relaxed text-text/90"
          />
        </div>

        <div className="border-t border-border/60 pt-4">
          <p className="mb-2 text-center text-sm text-muted">Tirá para ver si te sale.</p>
          <div className="flex justify-center">
            <Dice3D dc={stage.turn.dc} onResult={handleRoll} size={200} />
          </div>
        </div>
      </div>
    );
  }

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

  const left = MAX - text.length;

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-surface/50 p-5">
      <div>
        <label htmlFor="free-action" className="text-xs font-semibold uppercase tracking-widest text-primary">
          O escribí lo que se te ocurra
        </label>
        <p className="mt-1 text-xs text-muted">
          No hay respuestas incorrectas. El modelo aprende de cómo resolvés.
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
