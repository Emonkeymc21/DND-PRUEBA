"use client";

import * as React from "react";
import { Button, Card } from "@/components/ui";
import { DIMENSIONS, CAMPAIGN_PROFILES, zeroVector, type Vector } from "@/data/ml-simulation-dataset";
import { DIMENSION_LABEL } from "@/lib/ml/recommend";

/**
 * Panel de control del modelo.
 *
 * Dos formas de ajustarlo:
 *  - Sliders: fijás los pesos a mano.
 *  - Corrección: le decís "esta persona iba a X, no a Y" y el motor mueve los
 *    pesos solo (aprendizaje incremental estilo perceptrón).
 *
 * Los cambios se persisten en la tabla ml_weights. Sin base de datos el panel
 * funciona igual pero no guarda nada entre reinicios, y lo avisa.
 */

type Weights = Record<string, number>;

type FeedbackRow = {
  id: number;
  predicted: string;
  actual: string;
  created_at: string;
};

export default function ModelClient() {
  const [weights, setWeights] = React.useState<Weights>({});
  const [history, setHistory] = React.useState<FeedbackRow[]>([]);
  const [persisted, setPersisted] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  // Corrección
  const [vector, setVector] = React.useState<Vector>(zeroVector());
  const [predicted, setPredicted] = React.useState(CAMPAIGN_PROFILES[0]!.id);
  const [actual, setActual] = React.useState(CAMPAIGN_PROFILES[1]!.id);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ml/feedback", { cache: "no-store" });
      if (!res.ok) {
        setMsg("No se pudo cargar el modelo.");
        return;
      }
      const data = await res.json();
      setWeights(data.weights ?? {});
      setHistory(Array.isArray(data.history) ? data.history : []);
      setPersisted(Boolean(data.persisted));
    } catch {
      setMsg("Error de red.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function post(body: unknown, okMsg: string) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ml/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data?.error ?? "No se pudo guardar.");
        return;
      }

      setWeights(data.weights ?? {});
      setMsg(okMsg);
      void load();
    } catch {
      setMsg("Error de red.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-muted">Cargando modelo…</div>;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ---------------- Pesos ---------------- */}
      <Card className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold text-primary">Pesos por dimensión</h2>
          <p className="mt-1 text-xs text-muted">
            0 apaga la dimensión, 1 es neutro, 3 la triplica.
          </p>
        </div>

        {!persisted ? (
          <div className="rounded-xl border border-ember/50 bg-ember/10 p-3 text-xs text-text/85">
            Sin Upstash configurado, los cambios se guardan en memoria y se pierden en el próximo
            reinicio del servidor.
          </div>
        ) : null}

        <div className="space-y-3">
          {DIMENSIONS.map((d) => (
            <div key={d} className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xs capitalize text-text/85">{DIMENSION_LABEL[d]}</span>
                <span className="font-display text-xs font-bold text-primary">
                  {(weights[d] ?? 1).toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={3}
                step={0.05}
                value={weights[d] ?? 1}
                onChange={(e) => setWeights((w) => ({ ...w, [d]: parseFloat(e.target.value) }))}
                className="w-full accent-[rgb(var(--primary))]"
                aria-label={`Peso de ${DIMENSION_LABEL[d]}`}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={saving}
            onClick={() => void post({ mode: "manual", weights, note: "ajuste manual" }, "Pesos guardados.")}
          >
            Guardar pesos
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => void post({ mode: "reset" }, "Pesos restablecidos.")}
          >
            Restablecer
          </Button>
        </div>
      </Card>

      {/* ---------------- Corrección ---------------- */}
      <Card className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold text-primary">Enseñarle al modelo</h2>
          <p className="mt-1 text-xs text-muted">
            Cargá el perfil de un jugador, indicá qué recomendó el motor y qué correspondía en
            realidad. Los pesos se mueven en esa dirección.
          </p>
        </div>

        <div className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">
            Perfil del jugador
          </div>
          {DIMENSIONS.map((d) => (
            <div key={d} className="flex items-center gap-2">
              <span className="w-36 shrink-0 text-[11px] capitalize text-muted">{DIMENSION_LABEL[d]}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={vector[d]}
                onChange={(e) => setVector((v) => ({ ...v, [d]: parseFloat(e.target.value) }))}
                className="flex-1 accent-[rgb(var(--mystic))]"
                aria-label={DIMENSION_LABEL[d]}
              />
              <span className="w-8 shrink-0 text-right text-[11px] text-text/80">
                {Math.round(vector[d] * 100)}
              </span>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              El motor recomendó
            </span>
            <select
              value={predicted}
              onChange={(e) => setPredicted(e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-surface/80 px-3 py-2.5 text-sm text-text"
            >
              {CAMPAIGN_PROFILES.map((c) => (
                <option key={c.id} value={c.id} className="bg-surface">
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
              Correspondía
            </span>
            <select
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              className="w-full rounded-xl border border-border/70 bg-surface/80 px-3 py-2.5 text-sm text-text"
            >
              {CAMPAIGN_PROFILES.map((c) => (
                <option key={c.id} value={c.id} className="bg-surface">
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Button
          type="button"
          variant="mystic"
          disabled={saving || predicted === actual}
          className="w-full"
          onClick={() =>
            void post({ mode: "correction", vector, predicted, actual }, "Corrección aplicada.")
          }
        >
          {predicted === actual ? "Elegí dos campañas distintas" : "Aplicar corrección"}
        </Button>

        {history.length > 0 ? (
          <div className="space-y-1.5 border-t border-border/50 pt-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">
              Últimas correcciones
            </div>
            {history.slice(0, 8).map((h) => (
              <div key={h.id} className="flex items-center justify-between text-[11px] text-muted">
                <span>
                  {CAMPAIGN_PROFILES.find((c) => c.id === h.predicted)?.name ?? h.predicted} →{" "}
                  <span className="text-primary">
                    {CAMPAIGN_PROFILES.find((c) => c.id === h.actual)?.name ?? h.actual}
                  </span>
                </span>
                <span>{new Date(h.created_at).toLocaleDateString("es-AR")}</span>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      {msg ? (
        <div className="lg:col-span-2">
          <Card className="border-primary/40 bg-primary/5 text-sm text-text/90">{msg}</Card>
        </div>
      ) : null}
    </div>
  );
}
