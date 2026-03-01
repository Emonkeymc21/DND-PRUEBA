"use client";

import * as React from "react";
import { z } from "zod";
import { Button } from "@/components/ui";

const Schema = z.object({
  campaignId: z.number(),
  fullName: z.string().min(3),
  age: z.number().int().min(0).max(120).optional(),
  contact: z.string().min(3),
  country: z.string().min(2),
  availability: z.string().min(2),
  experience: z.enum(["nuevo", "intermedio", "avanzado"]),
  desiredRole: z.enum(["jugador", "dm", "flexible"]),
  preferences: z.string().min(3),
  linesVeils: z.string().optional(),
  characterJsonUrl: z.string().url().optional()
});

export default function RegistrationForm({ campaignId }: { campaignId: number }) {
  const [status, setStatus] = React.useState<"idle" | "loading" | "ok" | "err">("idle");
  const [msg, setMsg] = React.useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMsg("");

    const fd = new FormData(e.currentTarget);
    const raw = {
      campaignId,
      fullName: String(fd.get("fullName") || ""),
      age: fd.get("age") ? Number(fd.get("age")) : undefined,
      contact: String(fd.get("contact") || ""),
      country: String(fd.get("country") || ""),
      availability: String(fd.get("availability") || ""),
      experience: String(fd.get("experience") || "nuevo"),
      desiredRole: String(fd.get("desiredRole") || "jugador"),
      preferences: String(fd.get("preferences") || ""),
      linesVeils: String(fd.get("linesVeils") || "") || undefined,
      characterJsonUrl: String(fd.get("characterJsonUrl") || "") || undefined
    };

    const parsed = Schema.safeParse(raw);
    if (!parsed.success) {
      setStatus("err");
      setMsg("Revisá los campos (faltan datos o hay un formato inválido).");
      return;
    }

    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Error");
      setStatus("ok");
      setMsg("¡Listo! Te registraste. Te vamos a contactar.");
      e.currentTarget.reset();
    } catch (err: any) {
      setStatus("err");
      setMsg(err?.message || "No se pudo enviar");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <label className="text-sm md:col-span-1">
        <div className="mb-1 font-semibold text-primary">Nombre y apellido *</div>
        <input name="fullName" required className="w-full rounded-md border border-border/60 bg-bg px-4 py-3 text-base" />
      </label>

      <label className="text-sm md:col-span-1">
        <div className="mb-1 font-semibold text-primary">Edad (opcional)</div>
        <input name="age" type="number" min={0} max={120} className="w-full rounded-md border border-border/60 bg-bg px-4 py-3 text-base" />
      </label>

      <label className="text-sm md:col-span-1">
        <div className="mb-1 font-semibold text-primary">Discord/WhatsApp *</div>
        <input name="contact" required className="w-full rounded-md border border-border/60 bg-bg px-4 py-3 text-base" placeholder="@usuario / +54..." />
      </label>

      <label className="text-sm md:col-span-1">
        <div className="mb-1 font-semibold text-primary">Zona/País *</div>
        <input name="country" required className="w-full rounded-md border border-border/60 bg-bg px-4 py-3 text-base" placeholder="Mendoza, Argentina" />
      </label>

      <label className="text-sm md:col-span-2">
        <div className="mb-1 font-semibold text-primary">Disponibilidad horaria *</div>
        <input name="availability" required className="w-full rounded-md border border-border/60 bg-bg px-4 py-3 text-base" placeholder="Vie 20hs / Sáb tarde / ..." />
      </label>

      <label className="text-sm">
        <div className="mb-1 font-semibold text-primary">Experiencia *</div>
        <select name="experience" className="w-full rounded-md border border-border/60 bg-bg px-4 py-3 text-base">
          <option value="nuevo">Nuevo</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzado">Avanzado</option>
        </select>
      </label>

      <label className="text-sm">
        <div className="mb-1 font-semibold text-primary">Rol deseado *</div>
        <select name="desiredRole" className="w-full rounded-md border border-border/60 bg-bg px-4 py-3 text-base">
          <option value="jugador">Jugador</option>
          <option value="dm">DM</option>
          <option value="flexible">Flexible</option>
        </select>
      </label>

      <label className="text-sm md:col-span-2">
        <div className="mb-1 font-semibold text-primary">Preferencias de campaña *</div>
        <textarea name="preferences" required rows={3} className="w-full rounded-md border border-border/60 bg-bg px-4 py-3 text-base" placeholder="Horror, épica, humor, misterio..." />
      </label>

      <label className="text-sm md:col-span-2">
        <div className="mb-1 font-semibold text-primary">Límites / líneas y velos (opcional)</div>
        <textarea name="linesVeils" rows={3} className="w-full rounded-md border border-border/60 bg-bg px-4 py-3 text-base" placeholder="Campo sensible: lo usamos para cuidarte en mesa." />
        <div className="mt-1 text-xs text-text/70">
          Disclaimer: Este campo es sensible. No compartas datos personales innecesarios.
        </div>
      </label>

      <label className="text-sm md:col-span-2">
        <div className="mb-1 font-semibold text-primary">Link JSON de personaje (opcional)</div>
        <input name="characterJsonUrl" className="w-full rounded-md border border-border/60 bg-bg px-4 py-3 text-base" placeholder="https://..." />
      </label>

      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={status === "loading"}>Enviar</Button>
        <div className="text-sm">
          {status === "loading" && <span className="text-text/70">Enviando…</span>}
          {msg && <span className={status === "err" ? "text-red-300" : "text-primary"}>{msg}</span>}
        </div>
      </div>
    </form>
  );
}
