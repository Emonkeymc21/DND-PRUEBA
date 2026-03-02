"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { CAMPAIGN_EXAMPLES } from "@/data/campaigns";

function fmtGenre(g: any) {
  return Array.isArray(g) ? g.join(" / ") : String(g ?? "");
}

type Props = {
  onDone?: () => void;
  compact?: boolean;
};

const ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLScP2cSEbMdsVes4w8f1frB9hZSwP7xFsXjaY_Smm6AcGJsq3A/formResponse";

// Estos names vienen del index.html original (Google Forms)
const F = {
  email: "emailAddress",
  name: "entry.592377339",
  instagram: "entry.1145937670",
  experience: "entry.1662985932",
  rules: "entry.259189639",
  theme: "entry.1977972677",
  style: "entry.430852753",
  playMode: "entry.2000145625",
  freq: "entry.432896089",
  availability: ["entry.2140878283", "entry.2065289993", "entry.876431454"] as const,
  avoid: "entry.36863628",
  notes: "entry.28201251"
} as const;

const THEMES = [
  { label: "Fantasía Heroica Clásica", value: "Fantasía Heroica Clásica: Dragones, espadas y magia (Estilo El Señor de los Anillos o D&D Clásico)." },
  { label: "Mundo Mágico / Académico", value: "Mundo Mágico / Académico: Varitas, escuelas de magia, misterios juveniles (Estilo Harry Potter)." },
  { label: "Estilo Anime / Shonen", value: "Estilo Anime / Shonen:\nExorcistas, cazadores de demonios, técnicas especiales y mucha acción (Estilo Jujutsu Kaisen o Demon Slayer)." },
  { label: "Supervivencia Distópica", value: "Supervivencia Distópica: Un mundo cruel, competencias, rebelión (Estilo Los Juegos del Hambre)." },
  { label: "Cyberpunk / Ciencia Ficción", value: "Cyberpunk / Ciencia Ficción: Futuro distópico, hackers, naves espaciales (Estilo Blade Runner o Star Wars)." }
];

const EXPERIENCES = [
  "Soy nuevo (nunca jugué)",
  "Intermedio (jugué algunas partidas)",
  "Avanzado (juego seguido)"
];

const RULES = [
  {
    label: "D&D 5e",
    value:
      "Dungeons & Dragons 5e: Fantasía clásica, muchas reglas, opciones y combate táctico. (El más famoso)"
  },
  {
    label: "Sistema Ligero (Narrativo)",
    value:
      "Sistema Ligero (Ej: Dungeons World): Pocas reglas, se aprende en 10 minutos, enfocado 100% en la historia y narración."
  },
  { label: "Me da igual", value: "Me da igual: Me adapto a lo que elija la mayoría." }
];

const PLAY_MODES = [
  { label: "Presencial", value: "Presencial" },
  { label: "Online", value: "Online" },
  { label: "Me da igual", value: "Me da igual" }
];

const FREQUENCY = [
  { label: "1 vez por semana", value: "1 vez por semana" },
  { label: "Cada 2 semanas", value: "Cada 2 semanas" },
  { label: "1 vez por mes", value: "1 vez por mes" },
  { label: "Flexible", value: "Flexible" }
];

const AVAILABILITY = ["Mañana 10 hs", "Tarde 18 hs", "Noche 22 hs", "Fines de semana"];

export function RpgSignupForm({ onDone, compact }: Props) {
  const [step, setStep] = React.useState(0);
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  const dots = [0, 1, 2, 3];

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;

    const form = e.currentTarget;
    const fd = new FormData(form);

    setSending(true);
    try {
      await fetch("/api/forms/rpg", { method: "POST", body: fd });
      setSent(true);
      onDone?.();
    } catch {
      // Aun si falla por CORS, el envío puede haberse realizado.
      setSent(true);
      onDone?.();
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-primary">¡Destino Sellado!</h3>
        <p className="text-text/80">Tus datos fueron enviados al Maestro. Te voy a contactar por Instagram.</p>
        <Button type="button" onClick={() => setSent(false)} className="w-full">
          Volver a la taberna
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-center gap-2" aria-hidden>
        {dots.map((d) => (
          <span
            key={d}
            className={`h-2.5 w-2.5 rounded-full border border-border/60 ${d === step ? "bg-primary" : "bg-transparent"}`}
          />
        ))}
      </div>

      {step === 0 ? (
        <div className="space-y-3">
          <h3 className="text-center text-sm font-semibold tracking-[0.22em] text-text/60">I. IDENTIDAD</h3>

          <label className="block text-sm font-semibold text-primary">Correo electrónico</label>
          <input
            name={F.email}
            type="email"
            required
            className="w-full rounded-md border border-border/60 bg-bg px-4 py-3"
            placeholder="tu@email.com"
          />

          <label className="block text-sm font-semibold text-primary">Nombre o apodo</label>
          <input
            name={F.name}
            type="text"
            required
            className="w-full rounded-md border border-border/60 bg-bg px-4 py-3"
            placeholder="Ej: Emma_404"
          />

          <label className="block text-sm font-semibold text-primary">Contacto (Instagram)</label>
          <input
            name={F.instagram}
            type="text"
            required
            className="w-full rounded-md border border-border/60 bg-bg px-4 py-3"
            placeholder="@tuusuario"
          />

          <label className="block text-sm font-semibold text-primary">Nivel de experiencia</label>
          <select name={F.experience} required className="w-full rounded-md border border-border/60 bg-bg px-4 py-3">
            {EXPERIENCES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3">
          <h3 className="text-center text-sm font-semibold tracking-[0.22em] text-text/60">II. PREFERENCIAS</h3>

          <label className="block text-sm font-semibold text-primary">¿Qué tipo de reglas preferís?</label>
          <select name={F.rules} required className="w-full rounded-md border border-border/60 bg-bg px-4 py-3">
            {RULES.map((r) => (
              <option key={r.label} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <div className="rounded-xl border border-border/60 bg-black/20 p-3">
            <div className="text-sm font-semibold text-primary">Temática (elegí tus favoritas)</div>
            <div className="mt-2 grid gap-2">
              {THEMES.map((t) => (
                <label key={t.label} className="flex gap-2 text-sm">
                  <input type="checkbox" name={F.theme} value={t.value} />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="block text-sm font-semibold text-primary">Campaña / estilo que te gustaría</label>
          <select name={F.style} className="w-full rounded-md border border-border/60 bg-bg px-4 py-3">
            {CAMPAIGN_EXAMPLES.map((c) => (
              <option key={c.slug} value={`${c.title} — ${fmtGenre(c.genre)}`}>
                {c.title} — {fmtGenre(c.genre)}
              </option>
            ))}
            <option value="Flexible / Me adapto">Flexible / Me adapto</option>
          </select>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <h3 className="text-center text-sm font-semibold tracking-[0.22em] text-text/60">III. LOGÍSTICA</h3>

          <label className="block text-sm font-semibold text-primary">¿Cómo preferís jugar?</label>
          <select name={F.playMode} required className="w-full rounded-md border border-border/60 bg-bg px-4 py-3">
            {PLAY_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <label className="block text-sm font-semibold text-primary">Frecuencia de juego</label>
          <select name={F.freq} required className="w-full rounded-md border border-border/60 bg-bg px-4 py-3">
            {FREQUENCY.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <div className="rounded-xl border border-border/60 bg-black/20 p-3">
            <div className="text-sm font-semibold text-primary">Disponibilidad</div>
            <div className="mt-2 grid gap-2">
              {AVAILABILITY.map((a) => (
                <label key={a} className="flex gap-2 text-sm">
                  <input type="checkbox" name={F.availability[0]} value={a} />
                  <span>{a}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 text-xs text-text/60">
              Nota: en el Google Form original esto se guarda como selección múltiple.
            </div>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-3">
          <h3 className="text-center text-sm font-semibold tracking-[0.22em] text-text/60">IV. EL PACTO</h3>

          <label className="block text-sm font-semibold text-primary">Líneas y velos (temas a evitar)</label>
          <input
            name={F.avoid}
            type="text"
            className="w-full rounded-md border border-border/60 bg-bg px-4 py-3"
            placeholder="Opcional"
          />

          <label className="block text-sm font-semibold text-primary">Dudas o sugerencias</label>
          <textarea
            name={F.notes}
            className="min-h-[110px] w-full rounded-md border border-border/60 bg-bg px-4 py-3"
            placeholder="Opcional"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="ghost"
          className="w-full sm:w-auto"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || sending}
        >
          Atrás
        </Button>

        {step < 3 ? (
          <Button type="button" className="w-full sm:flex-1" onClick={() => setStep((s) => Math.min(3, s + 1))} disabled={sending}>
            Siguiente
          </Button>
        ) : (
          <Button type="submit" className="w-full sm:flex-1" disabled={sending}>
            {sending ? "Enviando…" : "Enviar"}
          </Button>
        )}
      </div>

      {compact ? null : (
        <div className="text-xs text-text/60">
          Este formulario funciona sin DB: envía a Google Forms (como el index original). 100% gratis / Netlify-friendly.
        </div>
      )}
    </form>
  );
}
