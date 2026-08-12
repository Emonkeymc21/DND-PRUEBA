"use client";

import * as React from "react";
import { TRAIT_META, type Traits } from "@/lib/traits";

/**
 * Barras del perfil del jugador.
 *
 * Dos tipos:
 * - Unipolar (0..100): barra clásica que se llena de izquierda a derecha.
 * - Bipolar (-100..100): la barra crece desde el centro hacia un lado u otro,
 *   porque "caótico 80" y "legal 80" son cosas distintas, no más o menos de lo
 *   mismo.
 */

function Bar({ traitKey, value }: { traitKey: keyof Traits; value: number }) {
  const meta = TRAIT_META[traitKey];

  if (!meta.bipolar) {
    const pct = Math.max(0, Math.min(100, value));
    return (
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-text/85">{meta.label}</span>
          <span className="font-display text-xs font-bold text-primary">{Math.round(pct)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface ring-1 ring-inset ring-border/70">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-deep to-primary transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[11px] text-muted">{meta.hint}</div>
      </div>
    );
  }

  // Bipolar: mitad del ancho como máximo hacia cada lado.
  const v = Math.max(-100, Math.min(100, value));
  const half = Math.abs(v) / 2;
  const toHigh = v >= 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text/85">{meta.label}</span>
        <span className="font-display text-xs font-bold text-primary">
          {v === 0 ? "—" : `${toHigh ? meta.high : meta.low} ${Math.round(Math.abs(v))}`}
        </span>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-surface ring-1 ring-inset ring-border/70">
        {/* Marca del centro */}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border" />
        <div
          className={[
            "absolute top-0 h-full transition-all duration-700 ease-out",
            toHigh
              ? "left-1/2 rounded-r-full bg-gradient-to-r from-primary-deep to-primary"
              : "right-1/2 rounded-l-full bg-gradient-to-l from-mystic/70 to-mystic",
          ].join(" ")}
          style={{ width: `${half}%` }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-muted">
        <span>{meta.low}</span>
        <span>{meta.high}</span>
      </div>
    </div>
  );
}

export function TraitBars({ traits, className }: { traits: Traits; className?: string }) {
  return (
    <div className={className}>
      <div className="grid gap-4">
        <Bar traitKey="creatividad" value={traits.creatividad} />
        <Bar traitKey="equipo" value={traits.equipo} />
        <Bar traitKey="ley" value={traits.ley} />
        <Bar traitKey="combate" value={traits.combate} />
      </div>
    </div>
  );
}

export default TraitBars;
