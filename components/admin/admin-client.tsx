"use client";

import * as React from "react";
import { Button, Card } from "@/components/ui";
import { toCSV } from "@/lib/utils";

type Row = {
  id: number;
  created_at: string;
  campaign_title: string | null;
  full_name: string;
  age: number | null;
  contact: string;
  country: string;
  availability: string;
  experience: string;
  desired_role: string;
  preferences: string;
  lines_veils: string | null;
  character_json_url: string | null;
  contacted: boolean;
};

export default function AdminClient() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [q, setQ] = React.useState("");
  const [onlyOpen, setOnlyOpen] = React.useState<"all" | "contacted" | "pending">("all");
  const [loading, setLoading] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/registrations", { cache: "no-store" });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { void load(); }, []);

  const filtered = rows.filter(r => {
    const hay = `${r.full_name} ${r.contact} ${r.country} ${r.campaign_title ?? ""}`.toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (onlyOpen === "contacted" && !r.contacted) return false;
    if (onlyOpen === "pending" && r.contacted) return false;
    return true;
  });

  async function toggleContacted(id: number, next: boolean) {
    const res = await fetch("/api/admin/registrations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, contacted: next })
    });
    if (res.ok) {
      setRows((rs) => rs.map(r => r.id === id ? { ...r, contacted: next } : r));
    }
  }

  function exportCSV() {
    const csv = toCSV(filtered.map(r => ({
      id: r.id,
      created_at: r.created_at,
      campaign: r.campaign_title ?? "",
      full_name: r.full_name,
      age: r.age ?? "",
      contact: r.contact,
      country: r.country,
      availability: r.availability,
      experience: r.experience,
      desired_role: r.desired_role,
      preferences: r.preferences,
      lines_veils: r.lines_veils ?? "",
      character_json_url: r.character_json_url ?? "",
      contacted: r.contacted
    })));

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscriptos-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-full sm:w-80 rounded-md border border-border/60 bg-bg px-4 py-3 text-base"
            placeholder="Buscar (nombre, contacto, país, campaña)…"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
          />
          <select
            className="w-full sm:w-80 rounded-md border border-border/60 bg-bg px-4 py-3 text-base"
            value={onlyOpen}
            onChange={(e)=>setOnlyOpen(e.target.value as any)}
            aria-label="Filtro"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="contacted">Contactados</option>
          </select>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" onClick={exportCSV} variant="ghost">Exportar CSV</Button>
          <Button type="button" onClick={load} variant="ghost">Refrescar</Button>
          <Button type="button" onClick={logout} variant="ghost">Salir</Button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="font-bold text-primary">Inscriptos ({filtered.length})</div>
          {loading && <div className="text-sm text-text/70">Cargando…</div>}
        </div>

        <div className="mt-3 overflow-auto rounded-xl border border-border/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/30">
              <tr className="text-text/80">
                <th className="p-2">Fecha</th>
                <th className="p-2">Campaña</th>
                <th className="p-2">Nombre</th>
                <th className="p-2">Contacto</th>
                <th className="p-2">País</th>
                <th className="p-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/50 hover:bg-black/20">
                  <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2">{r.campaign_title ?? "—"}</td>
                  <td className="p-2 break-words">{r.full_name}</td>
                  <td className="p-2 break-words">{r.contact}</td>
                  <td className="p-2">{r.country}</td>
                  <td className="p-2">
                    <button
                      className={`rounded-full border px-3 py-1 text-xs ${r.contacted ? "border-primary/70 text-primary" : "border-border/60 text-text/70 hover:border-primary/70 hover:text-primary"}`}
                      onClick={() => toggleContacted(r.id, !r.contacted)}
                    >
                      {r.contacted ? "Contactado" : "Pendiente"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="p-3 text-text/70" colSpan={6}>Sin resultados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
