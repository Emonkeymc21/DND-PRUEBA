"use client";

import * as React from "react";
import { Button } from "@/components/ui";

export default function AdminLoginForm() {
  const [status, setStatus] = React.useState<"idle" | "loading" | "err">("idle");
  const [msg, setMsg] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") || "");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      window.location.href = "/admin";
      return;
    }
    const data = await res.json().catch(() => ({}));
    setStatus("err");
    setMsg(data?.error || "No autorizado");
    setStatus("idle");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="text-sm">
        <div className="mb-1 font-semibold text-primary">Contraseña</div>
        <input name="password" type="password" className="w-full rounded-md border border-border/60 bg-bg px-3 py-2" required />
      </label>
      <Button type="submit" disabled={status === "loading"}>Entrar</Button>
      {msg && <div className="text-sm text-red-300">{msg}</div>}
    </form>
  );
}
