"use client";

import * as React from "react";
import { Button } from "@/components/ui";

export default function AdminLoginForm() {
  const [password, setPassword] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading">("idle");
  const [msg, setMsg] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading" || password.length === 0) return;

    setStatus("loading");
    setMsg(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Recarga completa para que el server component vuelva a leer la cookie.
        window.location.href = "/admin";
        return;
      }

      const data = await res.json().catch(() => ({}));
      setMsg(data?.error ?? "No autorizado");
    } catch {
      setMsg("Error de red. Probá de nuevo.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Contraseña
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          autoFocus
          className="w-full rounded-xl border border-border/70 bg-surface/80 px-4 py-3 text-base text-text outline-none transition focus:border-primary/70"
        />
      </label>

      <Button type="submit" disabled={status === "loading" || password.length === 0} className="w-full">
        {status === "loading" ? "Verificando…" : "Entrar"}
      </Button>

      {msg ? (
        <div className="rounded-xl border border-ember/50 bg-ember/10 px-4 py-3 text-sm text-text/90">{msg}</div>
      ) : null}
    </form>
  );
}
