"use client";

import * as React from "react";
import { Button, Card } from "@/components/ui";

type TreeOption = {
  id: string;
  label: string;
  keywords: string[];
  archetype_weight: Record<string, number>;
  next: string;
  consequence: string;
};

type TreeNode = {
  id: string;
  title: string;
  text: string;
  end?: boolean;
  archetype_result?: string;
  options: TreeOption[];
};

type TreeData = {
  rootNode: string;
  nodes: Record<string, TreeNode>;
  archetypes: Record<string, { tagline: string }>;
  baseNodeIds: string[];
  overlayNodeIds: string[];
  persisted: boolean;
};

const EMPTY_OPTION: TreeOption = {
  id: "",
  label: "",
  keywords: [],
  archetype_weight: {},
  next: "",
  consequence: "",
};

function emptyNode(): TreeNode {
  return { id: "", title: "", text: "", end: false, options: [] };
}

export default function TreeEditorClient() {
  const [data, setData] = React.useState<TreeData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<TreeNode>(emptyNode());
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tree", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function selectNode(id: string | null) {
    setSelectedId(id);
    setMsg(null);
    if (id && data?.nodes[id]) {
      setDraft(structuredClone(data.nodes[id]));
    } else {
      setDraft(emptyNode());
    }
  }

  function updateOption(index: number, patch: Partial<TreeOption>) {
    setDraft((d) => {
      const options = [...d.options];
      options[index] = { ...options[index]!, ...patch };
      return { ...d, options };
    });
  }

  function addOption() {
    if (draft.options.length >= 15) return;
    setDraft((d) => ({ ...d, options: [...d.options, { ...EMPTY_OPTION }] }));
  }

  function removeOption(index: number) {
    setDraft((d) => ({ ...d, options: d.options.filter((_, i) => i !== index) }));
  }

  async function save() {
    if (!draft.id.trim() || !draft.title.trim() || !draft.text.trim()) {
      setMsg("El nodo necesita al menos id, título y texto.");
      return;
    }

    setSaving(true);
    setMsg(null);

    const payload = {
      ...draft,
      options: draft.options.map((o) => ({
        ...o,
        keywords: o.keywords.filter((k) => k.trim().length > 0),
      })),
    };

    try {
      const res = await fetch("/api/admin/tree", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(result?.error ?? "No se pudo guardar el nodo.");
        return;
      }

      setMsg(
        result.persisted
          ? "Nodo guardado."
          : "Nodo guardado en memoria (sin Upstash configurado, se pierde en el próximo reinicio).",
      );
      await load();
      selectNode(draft.id);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!data?.overlayNodeIds.includes(id)) return;
    const res = await fetch(`/api/admin/tree?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) {
      await load();
      selectNode(null);
    }
  }

  if (loading) return <div className="text-sm text-muted">Cargando árbol…</div>;
  if (!data) return <div className="text-sm text-muted">No se pudo cargar el árbol.</div>;

  const allIds = Object.keys(data.nodes).sort();
  const isOverlay = selectedId ? data.overlayNodeIds.includes(selectedId) : false;

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Nodos</span>
          <Button type="button" variant="ghost" onClick={() => selectNode(null)} className="!px-3 !py-1.5 text-xs">
            + Nuevo
          </Button>
        </div>
        <div className="max-h-[28rem] space-y-1 overflow-auto">
          {allIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => selectNode(id)}
              className={[
                "w-full rounded-lg border px-3 py-2 text-left text-xs transition",
                selectedId === id
                  ? "border-primary/70 bg-primary/10 text-primary"
                  : "border-border/60 text-text/80 hover:border-primary/50",
              ].join(" ")}
            >
              <div className="truncate font-semibold">{data.nodes[id]!.title || id}</div>
              <div className="truncate text-[10px] text-muted">
                {id}
                {data.overlayNodeIds.includes(id) ? " · agregado" : ""}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
              ID único
            </span>
            <input
              value={draft.id}
              onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value.trim() }))}
              disabled={selectedId !== null && !isOverlay}
              placeholder="node_ejemplo"
              className="w-full rounded-lg border border-border/70 bg-surface/80 px-3 py-2 text-sm text-text disabled:opacity-50"
            />
          </label>

          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={!!draft.end}
              onChange={(e) => setDraft((d) => ({ ...d, end: e.target.checked }))}
              className="h-4 w-4 accent-[rgb(var(--primary))]"
            />
            <span className="text-sm text-text/80">Es un final</span>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Título</span>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className="w-full rounded-lg border border-border/70 bg-surface/80 px-3 py-2 text-sm text-text"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Texto</span>
          <textarea
            value={draft.text}
            onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
            rows={3}
            className="w-full resize-y rounded-lg border border-border/70 bg-surface/80 px-3 py-2 text-sm text-text"
          />
        </label>

        {draft.end ? (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
              Arquetipo de este final (opcional)
            </span>
            <input
              value={draft.archetype_result ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, archetype_result: e.target.value }))}
              className="w-full rounded-lg border border-border/70 bg-surface/80 px-3 py-2 text-sm text-text"
            />
          </label>
        ) : (
          <div className="space-y-3 border-t border-border/50 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                Opciones ({draft.options.length}/15)
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={addOption}
                disabled={draft.options.length >= 15}
                className="!px-3 !py-1.5 text-xs"
              >
                + Opción
              </Button>
            </div>

            {draft.options.map((opt, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border/60 bg-surface/40 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={opt.id}
                    onChange={(e) => updateOption(i, { id: e.target.value.trim() })}
                    placeholder="id de la opción"
                    className="rounded-lg border border-border/70 bg-bg/60 px-2.5 py-1.5 text-xs text-text"
                  />
                  <input
                    value={opt.next}
                    onChange={(e) => updateOption(i, { next: e.target.value.trim() })}
                    placeholder="nodo siguiente (id)"
                    className="rounded-lg border border-border/70 bg-bg/60 px-2.5 py-1.5 text-xs text-text"
                  />
                </div>
                <input
                  value={opt.label}
                  onChange={(e) => updateOption(i, { label: e.target.value })}
                  placeholder="Texto de la opción"
                  className="w-full rounded-lg border border-border/70 bg-bg/60 px-2.5 py-1.5 text-xs text-text"
                />
                <input
                  value={opt.keywords.join(", ")}
                  onChange={(e) => updateOption(i, { keywords: e.target.value.split(",").map((k) => k.trim()) })}
                  placeholder="palabras clave separadas por coma"
                  className="w-full rounded-lg border border-border/70 bg-bg/60 px-2.5 py-1.5 text-xs text-text"
                />
                <textarea
                  value={opt.consequence}
                  onChange={(e) => updateOption(i, { consequence: e.target.value })}
                  placeholder="Qué pasa cuando el jugador elige esto"
                  rows={2}
                  className="w-full resize-y rounded-lg border border-border/70 bg-bg/60 px-2.5 py-1.5 text-xs text-text"
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="text-[11px] text-ember/85 underline underline-offset-4 hover:text-ember"
                >
                  Quitar opción
                </button>
              </div>
            ))}
          </div>
        )}

        {msg ? <p className="text-xs text-primary">{msg}</p> : null}

        <div className="flex flex-wrap gap-2 border-t border-border/50 pt-4">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Guardando…" : "Guardar nodo"}
          </Button>
          {selectedId && isOverlay ? (
            <Button type="button" variant="ghost" onClick={() => void remove(selectedId)}>
              Borrar
            </Button>
          ) : null}
        </div>

        {!data.persisted ? (
          <p className="text-xs text-muted">
            Sin Upstash configurado, los nodos que agregues viven en memoria del proceso: se pierden en
            el próximo reinicio del servidor. Para que persistan, configurá{" "}
            <code>UPSTASH_REDIS_REST_URL</code> y <code>UPSTASH_REDIS_REST_TOKEN</code>.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
