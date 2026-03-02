"use client";

import * as React from "react";
import { Button } from "@/components/ui";
// Importante: Google Forms es MUY estricto con los valores de <option value="...">.
// Para que el envío no falle (o no se descarte silenciosamente), estos values deben
// coincidir EXACTAMENTE con los del index.html original.

type Props = {
  onDone?: () => void;
  compact?: boolean;
};

// Estos names vienen del index.html original (Google Forms)
const F = {
  email: "emailAddress",
  name: "entry.592377339",
  instagram: "entry.1145937670",
  experience: "entry.1662985932",
  rules: "entry.259189639",
  theme: "entry.1977972677",
  style: "entry.430852753", // range 1..5 (Combate <-> Rol)
  playMode: "entry.2000145625",
  freq: "entry.432896089",
  // Disponibilidad está separada por día en el form original:
  availabilityFri: "entry.876431454",
  availabilitySat: "entry.2140878283",
  availabilitySun: "entry.2065289993",
  avoid: "entry.36863628",
  notes: "entry.28201251"
} as const;

const GOOGLE_FORM_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLScP2cSEbMdsVes4w8f1frB9hZSwP7xFsXjaY_Smm6AcGJsq3A/formResponse";

const THEMES = [
  { label: "Fantasía Heroica Clásica", value: "Fantasía Heroica Clásica: Dragones, espadas y magia (Estilo El Señor de los Anillos o D&D Clásico)." },
  { label: "Mundo Mágico / Académico", value: "Mundo Mágico / Académico: Varitas, escuelas de magia, misterios juveniles (Estilo Harry Potter)." },
  { label: "Estilo Anime / Shonen", value: "Estilo Anime / Shonen: Exorcistas, cazadores de demonios, técnicas especiales y mucha acción (Estilo Jujutsu Kaisen o Demon Slayer)." },
  { label: "Supervivencia Distópica", value: "Supervivencia Distópica: Un mundo cruel, competencias, rebelión (Estilo Los Juegos del Hambre)." },
  { label: "Cyberpunk / Ciencia Ficción", value: "Cyberpunk / Ciencia Ficción: Futuro distópico, hackers, naves espaciales (Estilo Blade Runner o Star Wars)." }
];

const EXPERIENCES = [
  "Curioso/a: Nunca jugué, pero vi Stranger Things (o Big Bang Theory) y siempre quise probar.",
  "Espectador: Veo partidas en YouTube/Twitch (Critical Role, etc.) pero nunca jugué.",
  "Principiante: Jugué alguna vez o hace mucho tiempo.",
  "Veterano: Conozco las reglas y tengo mis propios dados."
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
  { label: "Presencial", value: "Presencial: Tengo disponibilidad para juntarme en una casa." },
  { label: "Virtual", value: "Virtual: Tengo PC/Celular, micrófono decente y conexión estable (Discord/Roll20)." },
  { label: "Híbrido/Indistinto", value: "Híbrido/Indistinto: Me adapto a cualquiera de las dos." }
];

const FREQUENCY = [
  { label: "Semanal", value: "Semanal: Una vez por semana (compromiso alto)." },
  { label: "Quincenal", value: "Quincenal: Cada dos semanas" },
  { label: "Mensual", value: "Mensual: Una sesión larga una vez al mes" },
  { label: "One-Shots", value: "One-Shots: Solo partidas sueltas de vez en cuando, sin continuidad." }
];

const AVAIL_OPTIONS_FRI = ["Tarde 18 hs", "Noche 20 hs"];
const AVAIL_OPTIONS_SAT = ["Tarde 18 hs", "Noche 20 hs"];
const AVAIL_OPTIONS_SUN = ["Tarde 18 hs", "Noche 20 hs"];

export function RpgSignupForm({ onDone, compact }: Props) {
  const [step, setStep] = React.useState(0);
  const [sent, setSent] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  const submittedRef = React.useRef(false);

  const dots = [0, 1, 2, 3];

  // En Netlify/Next, el método más robusto es dejar que el navegador haga el POST directo
  // a Google Forms (como en el index.html original), usando un iframe oculto como "target".
  // Así evitamos CORS y comportamientos diferentes de serverless.
  function submit(e: React.FormEvent<HTMLFormElement>) {
    if (sending) {
      e.preventDefault();
      return;
    }
    setSending(true);
    submittedRef.current = true;
    // NO preventDefault: dejamos que el browser haga el POST real a formResponse.
  }

  function onIframeLoad() {
    // El iframe carga 1 vez al montar. Solo contamos como "ok" si ya se intentó enviar.
    if (!submittedRef.current) return;
    setSending(false);
    setSent(true);
    submittedRef.current = false;
    onDone?.();
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
    <form
      onSubmit={submit}
      action={GOOGLE_FORM_ACTION}
      method="POST"
      target="hidden_iframe"
      className="space-y-4"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
          // Evita submits accidentales al navegar pasos.
          if (step < 3 && tag !== "textarea") {
            e.preventDefault();
          }
        }
      }}
    >
      <div className="flex items-center justify-center gap-2" aria-hidden>
        {dots.map((d) => (
          <span
            key={d}
            className={`h-2.5 w-2.5 rounded-full border border-border/60 ${d === step ? "bg-primary" : "bg-transparent"}`}
          />
        ))}
      </div>

      <div className={step === 0 ? "space-y-3" : "hidden space-y-3"}>
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

      <div className={step === 1 ? "space-y-3" : "hidden space-y-3"}>
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

          <label className="block text-sm font-semibold text-primary">Estilo de juego</label>
          <div className="flex justify-between text-xs text-text/60">
            <span>⚔️ Combate</span>
            <span>🗣️ Rol</span>
          </div>
          <input
            name={F.style}
            type="range"
            min={1}
            max={5}
            step={1}
            defaultValue={3}
            className="w-full"
          />
      </div>

      <div className={step === 2 ? "space-y-3" : "hidden space-y-3"}>
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
            <div className="mt-2 grid gap-3 text-sm">
              <div>
                <div className="mb-1 font-semibold text-primary">Viernes</div>
                <div className="grid gap-2">
                  {AVAIL_OPTIONS_FRI.map((v) => (
                    <label key={v} className="flex gap-2">
                      <input type="checkbox" name={F.availabilityFri} value={v} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 font-semibold text-primary">Sábado</div>
                <div className="grid gap-2">
                  {AVAIL_OPTIONS_SAT.map((v) => (
                    <label key={v} className="flex gap-2">
                      <input type="checkbox" name={F.availabilitySat} value={v} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 font-semibold text-primary">Domingo</div>
                <div className="grid gap-2">
                  {AVAIL_OPTIONS_SUN.map((v) => (
                    <label key={v} className="flex gap-2">
                      <input type="checkbox" name={F.availabilitySun} value={v} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={step === 3 ? "space-y-3" : "hidden space-y-3"}>
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
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          key="back"
          type="button"
          variant="ghost"
          className="w-full sm:w-auto"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || sending}
        >
          Atrás
        </Button>

        {step < 3 ? (
          <Button key="next" type="button" className="w-full sm:flex-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStep((s) => Math.min(3, s + 1)); }} disabled={sending}>
            Siguiente
          </Button>
        ) : (
          <Button key="submit" type="submit" className="w-full sm:flex-1" disabled={sending}>
            {sending ? "Enviando…" : "Enviar"}
          </Button>
        )}
      </div>

      {compact ? null : (
        <div className="text-xs text-text/60">
          Este formulario funciona sin DB: envía a Google Forms (como el index original). 100% gratis / Netlify-friendly.
        </div>
      )}

      {/* Iframe oculto para completar el POST cross-site sin navegar */}
      <iframe
        name="hidden_iframe"
        className="hidden"
        onLoad={onIframeLoad}
        title="hidden_iframe"
      />
    </form>
  );
}

export default RpgSignupForm;
