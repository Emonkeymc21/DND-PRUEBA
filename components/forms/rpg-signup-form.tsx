"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { CONTACT, hasAnyContact } from "@/lib/site";

/**
 * Formulario de postulación.
 *
 * Qué cambió respecto de la versión anterior:
 * - Ya no hace POST a Google Forms con un iframe oculto. Habla con /api/rpg-signup
 *   y sólo dice "listo" cuando el servidor confirma que guardó.
 * - Pasó de 4 pasos y 13 campos a 1 pantalla con 3 campos obligatorios.
 *   Todo lo demás lo preguntás en la charla; acá sólo necesitás poder escribirle.
 * - Honeypot + medición de tiempo para bots, sin captcha ni dependencias.
 * - Si el backend falla, muestra tus contactos directos en vez de un error seco.
 */

type Props = {
  onDone?: () => void;
  /** Etiquetas que dejó el test de la home, para no perder ese contexto. */
  quizTags?: string[];
  /** De dónde vino la persona (útil para saber qué canal funciona). */
  source?: string;
};

const EXPERIENCE = [
  { value: "nuevo", label: "Nunca jugué", hint: "Bienvenido. En serio." },
  { value: "poco", label: "Jugué alguna vez", hint: "Con eso alcanza." },
  { value: "bastante", label: "Juego seguido", hint: "Ya tenés tus dados." },
  { value: "dm", label: "Dirijo mesas", hint: "Necesitamos DMs." },
] as const;

const MODES = [
  { value: "online", label: "Online" },
  { value: "presencial", label: "Presencial" },
  { value: "indistinto", label: "Me da igual" },
] as const;

const AVAILABILITY = [
  "Vie tarde",
  "Vie noche",
  "Sáb tarde",
  "Sáb noche",
  "Dom tarde",
  "Dom noche",
  "Entre semana",
];

const THEMES = [
  "Fantasía épica",
  "Terror",
  "Anime / shonen",
  "Sci-fi / cyberpunk",
  "Misterio",
  "Humor",
];

type Status = "idle" | "sending" | "sent" | "error";

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "rounded-full border px-4 py-2 text-sm font-semibold transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border/70 bg-black/30 text-text/80 hover:border-primary/60 hover:text-primary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function FallbackContacts() {
  if (!hasAnyContact()) return null;

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-black/30 p-4 text-sm">
      <div className="font-semibold text-primary">Escribime directo:</div>
      <div className="flex flex-wrap gap-2">
        {CONTACT.instagram ? (
          <a
            className="rounded-full border border-border/70 px-3 py-1 hover:border-primary/70 hover:text-primary"
            href={`https://instagram.com/${CONTACT.instagram.replace(/^@/, "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>
        ) : null}
        {CONTACT.discord ? (
          <a
            className="rounded-full border border-border/70 px-3 py-1 hover:border-primary/70 hover:text-primary"
            href={CONTACT.discord}
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord
          </a>
        ) : null}
        {CONTACT.whatsapp ? (
          <a
            className="rounded-full border border-border/70 px-3 py-1 hover:border-primary/70 hover:text-primary"
            href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}

function RpgSignupForm({ onDone, quizTags = [], source }: Props) {
  const [name, setName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [experience, setExperience] = React.useState<string>("");
  const [mode, setMode] = React.useState<string>("indistinto");
  const [availability, setAvailability] = React.useState<string[]>([]);
  const [themes, setThemes] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState("");
  const [honeypot, setHoneypot] = React.useState("");

  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);

  // Marca de tiempo para detectar bots que completan al instante.
  const startedAt = React.useRef<number>(Date.now());

  const toggle = React.useCallback(
    (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
      setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
    },
    [],
  );

  const canSubmit =
    name.trim().length >= 2 &&
    contact.trim().length >= 3 &&
    experience !== "" &&
    status !== "sending";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/rpg-signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          experience,
          mode,
          availability,
          themes,
          notes: notes.trim(),
          quizTags,
          source: source ?? "web",
          website: honeypot,
          elapsedMs: Date.now() - startedAt.current,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (res.ok && data.ok) {
        setStatus("sent");
        onDone?.();
        return;
      }

      setStatus("error");
      setError(data.error ?? "No pudimos enviar tu postulación.");
    } catch {
      setStatus("error");
      setError("Se cortó la conexión. Revisá tu internet y probá de nuevo.");
    }
  }

  if (status === "sent") {
    return (
      <div className="space-y-3 rounded-2xl border border-primary/40 bg-primary/5 p-6 text-center">
        <div className="text-4xl">🎲</div>
        <div className="text-lg font-extrabold text-primary">¡Listo, {name.trim().split(" ")[0]}!</div>
        <p className="text-sm text-text/80">
          Ya tenemos tu postulación. Te escribimos a{" "}
          <span className="font-semibold text-text">{contact}</span> cuando armemos el grupo que te calce.
        </p>
        <p className="text-xs text-text/60">Mientras tanto, probá el simulador para ir tomándole la mano.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-6" noValidate>
      {/* Honeypot: invisible para personas, irresistible para bots. */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor="website">No completar</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-text/80">
            Tu nombre <span className="text-primary">*</span>
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            autoComplete="name"
            placeholder="Cómo te llamamos"
            className="w-full rounded-xl border border-border/70 bg-black/40 px-4 py-3 text-base text-text outline-none placeholder:text-text/40 focus-visible:ring-2 focus-visible:ring-primary/70"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-text/80">
            Dónde te escribimos <span className="text-primary">*</span>
          </span>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
            maxLength={120}
            placeholder="@instagram, usuario de Discord o mail"
            className="w-full rounded-xl border border-border/70 bg-black/40 px-4 py-3 text-base text-text outline-none placeholder:text-text/40 focus-visible:ring-2 focus-visible:ring-primary/70"
          />
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-text/80">
          ¿Cuánto jugaste? <span className="text-primary">*</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {EXPERIENCE.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setExperience(opt.value)}
              aria-pressed={experience === opt.value}
              className={[
                "rounded-xl border px-4 py-3 text-left transition",
                experience === opt.value
                  ? "border-primary bg-primary/10"
                  : "border-border/70 bg-black/30 hover:border-primary/60",
              ].join(" ")}
            >
              <div className="text-sm font-bold text-text">{opt.label}</div>
              <div className="text-xs text-text/60">{opt.hint}</div>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-text/80">¿Online o presencial?</legend>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <Chip key={m.value} active={mode === m.value} onClick={() => setMode(m.value)}>
              {m.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-text/80">
          ¿Cuándo podés? <span className="font-normal text-text/50">(las que quieras)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {AVAILABILITY.map((a) => (
            <Chip key={a} active={availability.includes(a)} onClick={() => toggle(setAvailability, a)}>
              {a}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-text/80">
          ¿Qué te tira más? <span className="font-normal text-text/50">(opcional)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <Chip key={t} active={themes.includes(t)} onClick={() => toggle(setThemes, t)}>
              {t}
            </Chip>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-text/80">
          Algo que quieras aclarar <span className="font-normal text-text/50">(opcional)</span>
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={600}
          placeholder="Temas que preferís evitar, horarios raros, si venís con un amigo…"
          className="w-full rounded-xl border border-border/70 bg-black/40 px-4 py-3 text-base text-text outline-none placeholder:text-text/40 focus-visible:ring-2 focus-visible:ring-primary/70"
        />
      </label>

      {status === "error" && error ? (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4">
          <div className="text-sm font-semibold text-red-200">{error}</div>
          <FallbackContacts />
        </div>
      ) : null}

      <div className="space-y-2">
        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl px-5 py-4 text-base font-extrabold"
        >
          {status === "sending" ? "Enviando…" : "Postularme"}
        </Button>
        <p className="text-center text-xs text-text/50">
          Sólo usamos tus datos para contactarte por la mesa. Nada de spam.
        </p>
      </div>
    </form>
  );
}

export { RpgSignupForm };
export default RpgSignupForm;
