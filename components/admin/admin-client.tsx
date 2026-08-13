"use client";

import * as React from "react";
import { Button, Card } from "@/components/ui";
import { toCSV } from "@/lib/utils";
import {
  EXPERIENCIA,
  SISTEMA,
  TEMATICA,
  MODALIDAD,
  FRECUENCIA,
  DISPONIBILIDAD,
  LINEAS_ROJAS,
  DIMENSIONS,
  ARCHETYPE_BY_ID,
  CAMPAIGN_BY_ID,
  type Vector,
} from "@/data/ml-simulation-dataset";
import { DIMENSION_LABEL } from "@/lib/ml/recommend";

type Row = {
  id: number;
  created_at: string;
  nombre: string;
  contacto: string;
  experiencia: string;
  sistema: string;
  tematicas: string[];
  modalidad: string;
  frecuencia: string;
  disponibilidad: string[];
  lineas_rojas: string[];
  notas: string | null;
  ml_tags: string[];
  ml_vector: Vector | null;
  ml_archetype: string | null;
  ml_campaign: string | null;
  contactado: boolean;
  archivado: boolean;
  source: string | null;
};

type Filter = "all" | "pending" | "contacted";

function labelOf(list: ReadonlyArray<{ value: string; label: string }>, v: string): string {
  return list.find((o) => o.value === v)?.label ?? v;
}

function labelsOf(list: ReadonlyArray<{ value: string; label: string }>, vs: string[]): string {
  return vs.length ? vs.map((v) => labelOf(list, v)).join(" · ") : "—";
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminClient() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/signups", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.detail || data?.error || "No se pudo cargar la lista.");
        setRows([]);
        return;
      }
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError("Error de red al cargar las postulaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "contacted" && !r.contactado) return false;
      if (filter === "pending" && r.contactado) return false;
      if (!needle) return true;
      const hay = [
        r.nombre,
        r.contacto,
        r.source ?? "",
        r.ml_archetype ?? "",
        r.ml_campaign ?? "",
        ...(r.tematicas ?? []),
        ...(r.ml_tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q, filter]);

  const pendingCount = rows.filter((r) => !r.contactado).length;

  async function patch(id: number, payload: { contactado?: boolean; archivado?: boolean }) {
    const prev = rows;
    setRows((rs) =>
      rs
        .map((r) => (r.id === id ? { ...r, ...payload } : r))
        .filter((r) => !(payload.archivado === true && r.id === id)),
    );

    const res = await fetch("/api/admin/signups", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });

    if (!res.ok) {
      setRows(prev);
      setError("No se pudo guardar el cambio.");
    }
  }

  function exportCSV() {
    const csv = toCSV(
      filtered.map((r) => ({
        id: r.id,
        fecha: r.created_at,
        nombre: r.nombre,
        contacto: r.contacto,
        experiencia: labelOf(EXPERIENCIA, r.experiencia),
        sistema: labelOf(SISTEMA, r.sistema),
        tematicas: labelsOf(TEMATICA, r.tematicas ?? []),
        modalidad: labelOf(MODALIDAD, r.modalidad),
        frecuencia: labelOf(FRECUENCIA, r.frecuencia),
        disponibilidad: labelsOf(DISPONIBILIDAD, r.disponibilidad ?? []),
        lineas_rojas: labelsOf(LINEAS_ROJAS, r.lineas_rojas ?? []),
        arquetipo: r.ml_archetype ? (ARCHETYPE_BY_ID.get(r.ml_archetype)?.name ?? r.ml_archetype) : "",
        campana_sugerida: r.ml_campaign ? (CAMPAIGN_BY_ID.get(r.ml_campaign)?.name ?? r.ml_campaign) : "",
        ...Object.fromEntries(DIMENSIONS.map((d) => [`eje_${d}`, r.ml_vector?.[d] ?? ""])),
        notas: r.notas ?? "",
        origen: r.source ?? "",
        contactado: r.contactado ? "si" : "no",
      })),
    );

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `postulaciones-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <input
            className="w-full rounded-xl border border-border/70 bg-surface/80 px-4 py-3 text-base sm:max-w-xs"
            placeholder="Buscar por nombre, contacto, arquetipo…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flex gap-2">
            {(["all", "pending", "contacted"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  filter === f
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/60 text-text/70 hover:border-primary/60",
                ].join(" ")}
              >
                {f === "all" ? "Todos" : f === "pending" ? `Pendientes (${pendingCount})` : "Contactados"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={exportCSV} variant="ghost">
            Exportar CSV
          </Button>
          <Button type="button" onClick={() => void load()} variant="ghost">
            Refrescar
          </Button>
          <Button as="link" href="/admin/modelo" variant="mystic">
            Modelo
          </Button>
          <Button type="button" onClick={logout} variant="ghost">
            Salir
          </Button>
        </div>
      </Card>

      {error ? (
        <Card className="border-ember/50 bg-ember/10">
          <div className="text-sm text-text/90">{error}</div>
        </Card>
      ) : null}

      {loading ? <div className="text-sm text-muted">Cargando…</div> : null}

      {!loading && filtered.length === 0 && !error ? (
        <Card className="text-center">
          <div className="font-display text-lg font-bold text-primary">Todavía no hay postulaciones</div>
          <p className="mt-2 text-sm text-muted">
            Si acabás de publicar el sitio, probá vos mismo el formulario para confirmar que la conexión
            con la base funciona.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {filtered.map((r) => {
          const arche = r.ml_archetype ? ARCHETYPE_BY_ID.get(r.ml_archetype) : undefined;
          const camp = r.ml_campaign ? CAMPAIGN_BY_ID.get(r.ml_campaign) : undefined;

          return (
            <Card key={r.id} className={r.contactado ? "opacity-60" : undefined}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base font-extrabold text-primary">{r.nombre}</span>
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted">
                      {labelOf(EXPERIENCIA, r.experiencia)}
                    </span>
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted">
                      {labelOf(SISTEMA, r.sistema)}
                    </span>
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted">
                      {labelOf(MODALIDAD, r.modalidad)}
                    </span>
                    {arche ? (
                      <span className="rounded-full border border-mystic/50 bg-mystic/10 px-2 py-0.5 text-[11px] font-semibold text-mystic">
                        {arche.name}
                      </span>
                    ) : null}
                  </div>

                  <div className="break-all text-sm text-text/90">{r.contacto}</div>

                  {/* Las líneas rojas van arriba y en rojo: es lo que no hay que pasar por alto. */}
                  {r.lineas_rojas?.length ? (
                    <div className="text-xs text-ember">
                      ⚠️ Evitar: {labelsOf(LINEAS_ROJAS, r.lineas_rojas)}
                    </div>
                  ) : null}

                  <div className="text-xs text-muted">
                    {fmtDate(r.created_at)}
                    {r.source ? ` · vía ${r.source}` : ""}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => void patch(r.id, { contactado: !r.contactado })}
                    className={[
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      r.contactado
                        ? "border-primary/70 text-primary"
                        : "border-border/60 text-text/70 hover:border-primary/70 hover:text-primary",
                    ].join(" ")}
                  >
                    {r.contactado ? "✓ Contactado" : "Marcar contactado"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => (v === r.id ? null : r.id))}
                    className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted hover:border-primary/70"
                    aria-expanded={expanded === r.id}
                  >
                    {expanded === r.id ? "−" : "+"}
                  </button>
                </div>
              </div>

              {expanded === r.id ? (
                <div className="mt-3 space-y-3 border-t border-border/50 pt-3 text-sm">
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <div>
                      <span className="text-muted">Temáticas: </span>
                      {labelsOf(TEMATICA, r.tematicas ?? [])}
                    </div>
                    <div>
                      <span className="text-muted">Frecuencia: </span>
                      {labelOf(FRECUENCIA, r.frecuencia)}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-muted">Disponibilidad: </span>
                      {labelsOf(DISPONIBILIDAD, r.disponibilidad ?? [])}
                    </div>
                  </div>

                  {camp ? (
                    <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
                      <span className="text-muted">Campaña sugerida por el modelo: </span>
                      <span className="font-semibold text-primary">{camp.name}</span>
                    </div>
                  ) : null}

                  {arche ? (
                    <div className="rounded-lg border border-border/60 bg-surface/60 p-3 text-xs text-muted">
                      <span className="font-semibold text-text/85">Consejo para el Master: </span>
                      {arche.masterTip}
                    </div>
                  ) : null}

                  {r.ml_vector ? (
                    <div className="space-y-1.5 rounded-lg border border-mystic/40 bg-mystic/5 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-mystic">
                        Perfil medido (8 ejes)
                      </div>
                      {DIMENSIONS.map((d) => {
                        const v = r.ml_vector![d] ?? 0.5;
                        return (
                          <div key={d} className="flex items-center gap-2">
                            <span className="w-36 shrink-0 text-[11px] capitalize text-muted">
                              {DIMENSION_LABEL[d]}
                            </span>
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                              <span
                                className="block h-full rounded-full bg-primary"
                                style={{ width: `${Math.round(v * 100)}%` }}
                              />
                            </span>
                            <span className="w-8 shrink-0 text-right text-[11px] text-text/80">
                              {Math.round(v * 100)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {r.notas ? (
                    <div className="rounded-lg border border-border/60 bg-bg/40 p-3 text-text/85">{r.notas}</div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void patch(r.id, { archivado: true })}
                    className="text-xs text-ember/85 underline underline-offset-4 hover:text-ember"
                  >
                    Archivar
                  </button>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
