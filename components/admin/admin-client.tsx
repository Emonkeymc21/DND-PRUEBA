"use client";

import * as React from "react";
import { Button, Card } from "@/components/ui";
import { toCSV } from "@/lib/utils";
import { TRAIT_META, type Traits } from "@/lib/traits";

type Row = {
  id: number;
  created_at: string;
  name: string;
  contact: string;
  experience: string;
  mode: string;
  availability: string[];
  themes: string[];
  notes: string | null;
  quiz_tags: string[];
  traits: Traits | null;
  contacted: boolean;
  archived: boolean;
  source: string | null;
};

type Filter = "all" | "pending" | "contacted";

const EXPERIENCE_LABEL: Record<string, string> = {
  nuevo: "Nunca jugó",
  poco: "Jugó poco",
  bastante: "Juega seguido",
  dm: "DM",
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
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
      if (filter === "contacted" && !r.contacted) return false;
      if (filter === "pending" && r.contacted) return false;
      if (!needle) return true;
      const hay = [r.name, r.contact, r.source ?? "", ...(r.themes ?? []), ...(r.availability ?? [])]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q, filter]);

  const pendingCount = rows.filter((r) => !r.contacted).length;

  async function patch(id: number, payload: { contacted?: boolean; archived?: boolean }) {
    // Optimista: actualizamos en pantalla y revertimos si el server rechaza.
    const prev = rows;
    setRows((rs) =>
      rs
        .map((r) => (r.id === id ? { ...r, ...payload } : r))
        .filter((r) => !(payload.archived === true && r.id === id)),
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
        nombre: r.name,
        contacto: r.contact,
        experiencia: EXPERIENCE_LABEL[r.experience] ?? r.experience,
        modalidad: r.mode,
        disponibilidad: (r.availability ?? []).join(" | "),
        temas: (r.themes ?? []).join(" | "),
        perfil_test: (r.quiz_tags ?? []).join(" | "),
        creatividad: r.traits?.creatividad ?? "",
        equipo: r.traits?.equipo ?? "",
        eje_ley: r.traits?.ley ?? "",
        eje_combate: r.traits?.combate ?? "",
        notas: r.notes ?? "",
        origen: r.source ?? "",
        contactado: r.contacted ? "si" : "no",
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
            className="w-full rounded-xl border border-border/60 bg-black/40 px-4 py-3 text-base sm:max-w-xs"
            placeholder="Buscar por nombre, contacto, tema…"
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
          <Button type="button" onClick={logout} variant="ghost">
            Salir
          </Button>
        </div>
      </Card>

      {error ? (
        <Card className="border-red-500/50 bg-red-500/10">
          <div className="text-sm text-red-200">{error}</div>
        </Card>
      ) : null}

      {loading ? <div className="text-sm text-text/70">Cargando…</div> : null}

      {!loading && filtered.length === 0 && !error ? (
        <Card className="text-center">
          <div className="text-lg font-bold text-primary">Todavía no hay postulaciones</div>
          <p className="mt-2 text-sm text-text/70">
            Si acabás de publicar el sitio, probá vos mismo el formulario desde la home para confirmar que la
            conexión con la base funciona.
          </p>
        </Card>
      ) : null}

      {/* Tarjetas en vez de tabla: en el celular una tabla de 8 columnas es ilegible. */}
      <div className="grid gap-3">
        {filtered.map((r) => (
          <Card key={r.id} className={r.contacted ? "opacity-60" : undefined}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-extrabold text-primary">{r.name}</span>
                  <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-text/70">
                    {EXPERIENCE_LABEL[r.experience] ?? r.experience}
                  </span>
                  <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-text/70">
                    {r.mode}
                  </span>
                </div>
                <div className="break-all text-sm text-text/90">{r.contact}</div>
                <div className="text-xs text-text/50">
                  {fmtDate(r.created_at)}
                  {r.source ? ` · vía ${r.source}` : ""}
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => void patch(r.id, { contacted: !r.contacted })}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    r.contacted
                      ? "border-primary/70 text-primary"
                      : "border-border/60 text-text/70 hover:border-primary/70 hover:text-primary",
                  ].join(" ")}
                >
                  {r.contacted ? "✓ Contactado" : "Marcar contactado"}
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded((v) => (v === r.id ? null : r.id))}
                  className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-text/70 hover:border-primary/70"
                  aria-expanded={expanded === r.id}
                >
                  {expanded === r.id ? "−" : "+"}
                </button>
              </div>
            </div>

            {expanded === r.id ? (
              <div className="mt-3 space-y-2 border-t border-border/50 pt-3 text-sm">
                {r.availability?.length ? (
                  <div>
                    <span className="text-text/60">Disponible: </span>
                    {r.availability.join(" · ")}
                  </div>
                ) : null}
                {r.themes?.length ? (
                  <div>
                    <span className="text-text/60">Le interesa: </span>
                    {r.themes.join(" · ")}
                  </div>
                ) : null}
                {r.quiz_tags?.length ? (
                  <div>
                    <span className="text-text/60">Perfil del test: </span>
                    {r.quiz_tags.join(" · ")}
                  </div>
                ) : null}
                {r.traits ? (
                  <div className="space-y-1.5 rounded-lg border border-mystic/40 bg-mystic/5 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-mystic">
                      Perfil medido en el simulador
                    </div>
                    {(Object.keys(TRAIT_META) as Array<keyof Traits>).map((k) => {
                      const meta = TRAIT_META[k];
                      const v = r.traits![k];
                      // Los ejes bipolares van de -100 a 100: los llevamos a 0..100
                      // para dibujar la barra.
                      const pct = meta.bipolar ? (v + 100) / 2 : v;
                      return (
                        <div key={k} className="flex items-center gap-2">
                          <span className="w-32 shrink-0 text-[11px] text-muted">{meta.label}</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                            <span
                              className="block h-full rounded-full bg-primary"
                              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                            />
                          </span>
                          <span className="w-9 shrink-0 text-right text-[11px] text-text/80">{Math.round(v)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {r.notes ? (
                  <div className="rounded-lg border border-border/60 bg-black/30 p-3 text-text/85">{r.notes}</div>
                ) : null}
                <button
                  type="button"
                  onClick={() => void patch(r.id, { archived: true })}
                  className="text-xs text-red-300/80 underline underline-offset-4 hover:text-red-200"
                >
                  Archivar
                </button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
