"use client";

import * as React from "react";
import { playDiceRoll, playCrit, playFumble, playSuccess, playFailure } from "@/lib/audio/sfx";

/**
 * D20 interactivo.
 *
 * Implementación: un SVG de icosaedro en proyección isométrica al que se le
 * aplica `rotate3d` desde CSS. Se compone en GPU (transform + opacity nada
 * más), así que va fluido incluso en gama media.
 *
 * Por qué no three.js: son ~600 kb de JS para un dado. Por qué no un icosaedro
 * real de 20 caras en CSS 3D: hay que ajustar 20 transforms a ojo contra el
 * navegador, y el resultado se rompe distinto en cada motor. Esto se ve sólido
 * y es predecible.
 *
 * El resultado es aleatorio de verdad (crypto cuando está disponible) y se
 * calcula ANTES de la animación: la animación muestra el resultado, no lo decide.
 */

export type RollResult = {
  /** El d20 pelado, 1..20. */
  roll: number;
  /** Modificador aplicado. */
  mod: number;
  /** roll + mod. */
  total: number;
  /** Dificultad contra la que se comparó, si había. */
  dc: number | null;
  /** total >= dc. null si no había DC. */
  success: boolean | null;
  crit: boolean;
  fumble: boolean;
};

/** Aleatoriedad real: crypto si existe, Math.random si no. */
function rollD20(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    // Rechazo del resto para no sesgar hacia los números bajos.
    const limit = Math.floor(0xffffffff / 20) * 20;
    let v = 0;
    do {
      crypto.getRandomValues(arr);
      v = arr[0]!;
    } while (v >= limit);
    return (v % 20) + 1;
  }
  return Math.floor(Math.random() * 20) + 1;
}

type Props = {
  /** Modificador que se suma a la tirada. */
  mod?: number;
  /** Dificultad a superar. Si va null, sólo tira y muestra el número. */
  dc?: number | null;
  label?: string;
  disabled?: boolean;
  size?: number;
  onResult?: (r: RollResult) => void;
};

type Phase = "idle" | "rolling" | "done";

const ROLL_MS = 1100;

export function D20({ mod = 0, dc = null, label, disabled = false, size = 132, onResult }: Props) {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [result, setResult] = React.useState<RollResult | null>(null);
  const [face, setFace] = React.useState(20);
  const [spin, setSpin] = React.useState({ x: 0, y: 0, z: 0 });

  const timers = React.useRef<number[]>([]);
  const shuffle = React.useRef<number | null>(null);

  const clearTimers = React.useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    if (shuffle.current !== null) {
      window.clearInterval(shuffle.current);
      shuffle.current = null;
    }
  }, []);

  React.useEffect(() => clearTimers, [clearTimers]);

  const roll = React.useCallback(() => {
    if (phase === "rolling" || disabled) return;

    clearTimers();
    setPhase("rolling");
    setResult(null);

    playDiceRoll(ROLL_MS);

    // Giro aleatorio y amplio para que dos tiradas nunca se vean iguales.
    setSpin({
      x: 720 + Math.floor(Math.random() * 720),
      y: 720 + Math.floor(Math.random() * 720),
      z: Math.floor(Math.random() * 360),
    });

    // Números cambiando durante el vuelo: puro feedback visual.
    shuffle.current = window.setInterval(() => setFace(rollD20()), 70);

    // El resultado real se decide acá, no al final.
    const value = rollD20();
    const total = value + mod;
    const success = dc === null ? null : total >= dc;

    const r: RollResult = {
      roll: value,
      mod,
      total,
      dc,
      success,
      crit: value === 20,
      fumble: value === 1,
    };

    timers.current.push(
      window.setTimeout(() => {
        if (shuffle.current !== null) {
          window.clearInterval(shuffle.current);
          shuffle.current = null;
        }
        setFace(value);
        setResult(r);
        setPhase("done");

        if (r.crit) playCrit();
        else if (r.fumble) playFumble();
        else if (success === true) playSuccess();
        else if (success === false) playFailure();

        onResult?.(r);
      }, ROLL_MS),
    );
  }, [phase, disabled, mod, dc, onResult, clearTimers]);

  const tone =
    result?.crit
      ? "crit"
      : result?.fumble
        ? "fumble"
        : result?.success === true
          ? "ok"
          : result?.success === false
            ? "bad"
            : "idle";

  const RING: Record<string, string> = {
    idle: "rgb(var(--primary) / .45)",
    ok: "rgb(var(--primary) / .95)",
    bad: "rgb(var(--ember) / .9)",
    crit: "rgb(var(--primary))",
    fumble: "rgb(var(--ember))",
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={roll}
        disabled={disabled || phase === "rolling"}
        aria-label={phase === "rolling" ? "Tirando el dado" : "Tirar d20"}
        className="group relative grid place-items-center rounded-full outline-none transition disabled:cursor-not-allowed"
        style={{ width: size, height: size, perspective: `${size * 5}px` }}
      >
        {/* Halo que reacciona al resultado */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full transition-all duration-500"
          style={{
            boxShadow:
              phase === "done"
                ? `0 0 ${result?.crit || result?.fumble ? 46 : 26}px ${RING[tone]}`
                : `0 0 16px ${RING.idle}`,
          }}
        />

        <span
          className="relative block will-change-transform"
          style={{
            width: size,
            height: size,
            transformStyle: "preserve-3d",
            transform: `rotate3d(1, .8, .35, ${spin.x}deg) rotateY(${spin.y}deg) rotateZ(${spin.z}deg)`,
            transition:
              phase === "rolling"
                ? `transform ${ROLL_MS}ms cubic-bezier(.16,.85,.28,1)`
                : "transform .5s ease-out",
          }}
        >
          <D20Svg size={size} face={face} tone={tone} />
        </span>
      </button>

      <div className="min-h-[3.25rem] text-center">
        {phase === "idle" ? (
          <button
            type="button"
            onClick={roll}
            disabled={disabled}
            className="rounded-xl border border-primary/60 bg-primary/10 px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/20 disabled:opacity-50"
          >
            {label ?? (dc !== null ? `Tirar d20 (DC ${dc})` : "Tirar d20")}
          </button>
        ) : phase === "rolling" ? (
          <div className="text-sm font-semibold text-muted">Rodando…</div>
        ) : result ? (
          <div className="space-y-0.5">
            <div className="font-display text-sm font-bold">
              <span className="text-text">{result.roll}</span>
              {result.mod !== 0 ? (
                <span className="text-muted">
                  {result.mod > 0 ? " + " : " − "}
                  {Math.abs(result.mod)} = <span className="text-text">{result.total}</span>
                </span>
              ) : null}
              {result.dc !== null ? <span className="text-muted"> vs DC {result.dc}</span> : null}
            </div>
            <div
              className={[
                "text-xs font-extrabold uppercase tracking-widest",
                result.crit
                  ? "text-primary"
                  : result.fumble
                    ? "text-ember"
                    : result.success === true
                      ? "text-primary"
                      : result.success === false
                        ? "text-ember"
                        : "text-muted",
              ].join(" ")}
            >
              {result.crit
                ? "¡Crítico!"
                : result.fumble
                  ? "Pifia"
                  : result.success === true
                    ? "Éxito"
                    : result.success === false
                      ? "Fallo"
                      : "Listo"}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Icosaedro en proyección isométrica. Las caras se sombrean distinto para dar volumen. */
function D20Svg({ size, face, tone }: { size: number; face: number; tone: string }) {
  const stroke =
    tone === "bad" || tone === "fumble" ? "rgb(var(--ember))" : "rgb(var(--primary))";

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`Dado de veinte caras mostrando ${face}`}
    >
      <defs>
        <linearGradient id="d20-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity="0.95" />
          <stop offset="100%" stopColor="rgb(var(--primary-deep))" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="d20-left" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--primary-deep))" stopOpacity="0.95" />
          <stop offset="100%" stopColor="rgb(var(--surface))" stopOpacity="0.98" />
        </linearGradient>
        <linearGradient id="d20-right" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--mystic))" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rgb(var(--surface))" stopOpacity="0.98" />
        </linearGradient>
      </defs>

      {/* Cuerpo del dado */}
      <polygon points="50,3 92,27 92,73 50,97 8,73 8,27" fill="url(#d20-left)" />
      {/* Cara superior */}
      <polygon points="50,3 92,27 50,51 8,27" fill="url(#d20-top)" />
      {/* Facetas laterales inferiores */}
      <polygon points="50,51 92,27 92,73" fill="url(#d20-right)" opacity="0.85" />
      <polygon points="50,51 8,27 8,73" fill="url(#d20-left)" opacity="0.7" />
      <polygon points="50,51 8,73 50,97 92,73" fill="rgb(var(--surface))" opacity="0.75" />

      {/* Aristas */}
      <g fill="none" stroke={stroke} strokeWidth="1.1" strokeLinejoin="round" opacity="0.75">
        <polygon points="50,3 92,27 92,73 50,97 8,73 8,27" strokeWidth="1.6" />
        <path d="M50 3 L50 51 M8 27 L50 51 L92 27 M8 73 L50 51 L92 73 M50 51 L50 97" />
      </g>

      {/* Cara central con el número */}
      <polygon
        points="50,20 72,40 50,60 28,40"
        fill="rgb(var(--bg))"
        fillOpacity="0.55"
        stroke={stroke}
        strokeWidth="1.2"
      />
      <text
        x="50"
        y="46"
        textAnchor="middle"
        fontSize={face >= 10 ? "20" : "23"}
        fontWeight="bold"
        fontFamily="var(--font-display), Georgia, serif"
        fill="rgb(var(--text))"
      >
        {face}
      </text>
    </svg>
  );
}

export default D20;
