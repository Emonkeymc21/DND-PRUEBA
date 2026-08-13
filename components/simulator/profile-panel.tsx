"use client";

import * as React from "react";
import { DIMENSIONS, type Vector } from "@/data/ml-simulation-dataset";
import { DIMENSION_LABEL } from "@/lib/ml/recommend";

/**
 * Panel del perfil inferido.
 *
 * Muestra las 8 dimensiones, el arquetipo dominante y las campañas
 * recomendadas. Las barras se animan al cambiar para que se note que el modelo
 * está reaccionando a lo que la persona hace.
 */

export type MlArchetype = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  suggestedClass: string;
  masterTip: string;
  score: number;
};

export type MlCampaign = {
  id: string;
  name: string;
  pitch: string;
  score: number;
  reasons: string[];
  blocked: boolean;
};

function DimensionBar({ dim, value }: { dim: (typeof DIMENSIONS)[number]; value: number }) {
  const pct = Math.round(value * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] capitalize text-text/85">{DIMENSION_LABEL[dim]}</span>
        <span className="font-display text-[11px] font-bold text-primary">{pct}</span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-surface ring-1 ring-inset ring-border/60">
        {/* Marca del 50%: referencia visual del punto neutro. */}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border" />
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-deep to-primary transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ProfilePanel({
  vector,
  archetype,
  campaigns,
  confidence,
  compact = false,
}: {
  vector: Vector;
  archetype: MlArchetype | null;
  campaigns: MlCampaign[];
  confidence: number | null;
  compact?: boolean;
}) {
  const visible = campaigns.filter((c) => !c.blocked).slice(0, compact ? 1 : 3);

  return (
    <div className="space-y-4">
      {archetype ? (
        <div className="rounded-xl border border-mystic/45 bg-mystic/10 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-mystic">
            Arquetipo detectado
          </div>
          <div className="font-display text-lg font-bold text-primary">{archetype.name}</div>
          <div className="text-xs italic text-text/80">{archetype.tagline}</div>
          {!compact ? (
            <p className="mt-2 text-xs leading-relaxed text-text/75">{archetype.description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-primary/50 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              Clase: {archetype.suggestedClass}
            </span>
            <span className="rounded-full border border-border/70 px-2.5 py-0.5 text-[11px] text-muted">
              Calce {Math.round(archetype.score * 100)}%
            </span>
          </div>
        </div>
      ) : null}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
            Ejes del perfil
          </span>
          {confidence !== null ? (
            <span
              className="text-[10px] text-muted"
              title="Qué tan parecidas son tus respuestas a los ejemplos que conoce el modelo"
            >
              confianza {Math.round(confidence * 100)}%
            </span>
          ) : null}
        </div>
        {DIMENSIONS.map((d) => (
          <DimensionBar key={d} dim={d} value={vector[d]} />
        ))}
      </div>

      {visible.length > 0 ? (
        <div className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">
            Campañas que te calzan
          </div>
          {visible.map((c, i) => (
            <div
              key={c.id}
              className={[
                "rounded-xl border p-3",
                i === 0 ? "border-primary/50 bg-primary/5" : "border-border/60 bg-surface/50",
              ].join(" ")}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-text">{c.name}</span>
                <span className="font-display text-xs font-bold text-primary">
                  {Math.round(c.score * 100)}%
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-text/70">{c.pitch}</p>
              {!compact && c.reasons.length > 0 ? (
                <ul className="mt-1.5 space-y-0.5">
                  {c.reasons.slice(0, 2).map((r) => (
                    <li key={r} className="text-[11px] text-muted">
                      · {r}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default ProfilePanel;
