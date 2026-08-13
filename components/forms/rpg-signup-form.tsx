"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { CONTACT, hasAnyContact } from "@/lib/site";
import {
  EXPERIENCIA,
  SISTEMA,
  TEMATICA,
  MODALIDAD,
  FRECUENCIA,
  DISPONIBILIDAD,
  LINEAS_ROJAS,
  type ExperienciaValue,
  type SistemaValue,
  type TematicaValue,
  type ModalidadValue,
  type FrecuenciaValue,
  type DisponibilidadValue,
  type LineaRojaValue,
  type Vector,
} from "@/data/ml-simulation-dataset";

/**
 * Formulario de postulación.
 *
 * Los valores salen de data/ml-simulation-dataset.ts, la misma fuente que usa
 * el motor de ML y el esquema de la base. Si mañana agregás una temática, la
 * agregás en un solo lugar y aparece acá, en el validador y en el recomendador.
 *
 * Sigue siendo una sola pantalla: lo obligatorio son nombre y contacto. Todo lo
 * demás tiene un valor por defecto razonable, así que se puede mandar en 15
 * segundos y afinar en la charla.
 */

const PROFILE_TAGS_KEY = "mesa_perfil_tags";
const PROFILE_VECTOR_KEY = "mesa_perfil_vector";
const PROFILE_ML_KEY = "mesa_perfil_ml";

type MlProfile = {
  archetype?: { id: string; name: string; suggestedClass: string } | null;
  campaign?: { id: string; name: string; score: number } | null;
  inferredFields?: {
    sistema: SistemaValue;
    tematica: TematicaValue;
    frecuencia: FrecuenciaValue;
  } | null;
};

type Props = {
  onDone?: () => void;
  quizTags?: string[];
  source?: string;
};

type Status = "idle" | "sending" | "sent" | "error";

function Chip({
  active,
  children,
  onClick,
  tone = "gold",
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  tone?: "gold" | "ember";
}) {
  const activeCls =
    tone === "ember"
      ? "border-ember bg-ember/15 text-ember"
      : "border-primary bg-primary/15 text-primary";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "rounded-full border px-4 py-2 text-sm font-semibold transition",
        active
          ? activeCls
          : "border-border/70 bg-surface/60 text-text/80 hover:border-primary/60 hover:text-primary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {label} {required ? <span className="text-primary">*</span> : null}
      </legend>
      {children}
      {hint ? <p className="mt-1.5 text-[11px] text-muted">{hint}</p> : null}
    </fieldset>
  );
}

function FallbackContacts() {
  if (!hasAnyContact()) return null;

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-surface/60 p-4 text-sm">
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

export function RpgSignupForm({ onDone, quizTags = [], source }: Props) {
  // --- Campos del formulario ---
  const [nombre, setNombre] = React.useState("");
  const [contacto, setContacto] = React.useState("");
  const [experiencia, setExperiencia] = React.useState<ExperienciaValue | "">("");
  const [sistema, setSistema] = React.useState<SistemaValue>("indistinto");
  const [tematicas, setTematicas] = React.useState<TematicaValue[]>([]);
  const [modalidad, setModalidad] = React.useState<ModalidadValue>("indistinto");
  const [frecuencia, setFrecuencia] = React.useState<FrecuenciaValue>("quincenal");
  const [disponibilidad, setDisponibilidad] = React.useState<DisponibilidadValue[]>([]);
  const [lineasRojas, setLineasRojas] = React.useState<LineaRojaValue[]>([]);
  const [notas, setNotas] = React.useState("");
  const [honeypot, setHoneypot] = React.useState("");

  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);

  // --- Perfil que dejó el simulador ---
  const [mlTags, setMlTags] = React.useState<string[]>([]);
  const [mlVector, setMlVector] = React.useState<Vector | null>(null);
  const [mlProfile, setMlProfile] = React.useState<MlProfile | null>(null);
  const [autofilled, setAutofilled] = React.useState(false);

  const startedAt = React.useRef<number>(Date.now());

  React.useEffect(() => {
    try {
      const rawTags = window.sessionStorage.getItem(PROFILE_TAGS_KEY);
      if (rawTags) {
        const parsed: unknown = JSON.parse(rawTags);
        if (Array.isArray(parsed)) {
          setMlTags(parsed.filter((t): t is string => typeof t === "string"));
        }
      }

      const rawVector = window.sessionStorage.getItem(PROFILE_VECTOR_KEY);
      if (rawVector) setMlVector(JSON.parse(rawVector) as Vector);

      const rawMl = window.sessionStorage.getItem(PROFILE_ML_KEY);
      if (rawMl) {
        const profile = JSON.parse(rawMl) as MlProfile;
        setMlProfile(profile);

        // Precompletamos con lo que infirió el modelo. La persona lo puede
        // cambiar: es una sugerencia, no una decisión tomada por ella.
        if (profile.inferredFields) {
          setSistema(profile.inferredFields.sistema);
          setFrecuencia(profile.inferredFields.frecuencia);
          setTematicas([profile.inferredFields.tematica]);
          setAutofilled(true);
        }
      }
    } catch {
      // sessionStorage bloqueado (modo privado): seguimos sin perfil.
    }
  }, []);

  function toggle<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, value: T) {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  const canSubmit =
    nombre.trim().length >= 2 &&
    contacto.trim().length >= 3 &&
    experiencia !== "" &&
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
          nombre: nombre.trim(),
          contacto: contacto.trim(),
          experiencia,
          sistema,
          tematicas,
          modalidad,
          frecuencia,
          disponibilidad,
          lineasRojas,
          notas: notas.trim(),
          // Metadata inferida por el modelo
          mlTags: Array.from(new Set([...quizTags, ...mlTags])).slice(0, 14),
          mlVector,
          mlArchetype: mlProfile?.archetype?.id ?? null,
          mlCampaign: mlProfile?.campaign?.id ?? null,
          source: source ?? "web",
          website: honeypot,
          elapsedMs: Date.now() - startedAt.current,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (res.ok && data.ok) {
        setStatus("sent");
        try {
          window.sessionStorage.removeItem(PROFILE_TAGS_KEY);
          window.sessionStorage.removeItem(PROFILE_VECTOR_KEY);
          window.sessionStorage.removeItem(PROFILE_ML_KEY);
        } catch {
          /* noop */
        }
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
        <div className="font-display text-lg font-extrabold text-primary">
          ¡Listo, {nombre.trim().split(" ")[0]}!
        </div>
        <p className="text-sm text-text/80">
          Ya tenemos tu postulación. Te escribimos a{" "}
          <span className="font-semibold text-text">{contacto}</span> cuando armemos el grupo que te calce.
        </p>
        {mlProfile?.campaign ? (
          <p className="text-xs text-muted">
            Te vamos a tener en cuenta para <span className="text-primary">{mlProfile.campaign.name}</span>.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-7" noValidate>
      {/* Honeypot */}
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

      {mlTags.length > 0 ? (
        <div className="rounded-xl border border-mystic/45 bg-mystic/10 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-mystic">
            {mlProfile?.archetype ? `Perfil detectado: ${mlProfile.archetype.name}` : "Perfil del simulador"}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {mlTags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-mystic/50 px-3 py-1 text-xs font-semibold text-mystic"
              >
                {t}
              </span>
            ))}
          </div>
          {autofilled ? (
            <p className="mt-2 text-xs text-muted">
              Precompletamos sistema, temática y frecuencia según cómo jugaste. Cambiá lo que no te
              represente.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Tu nombre <span className="text-primary">*</span>
          </span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            maxLength={80}
            autoComplete="name"
            placeholder="Cómo te llamamos"
            className="w-full rounded-xl border border-border/70 bg-surface/80 px-4 py-3 text-base text-text outline-none transition placeholder:text-muted/60 focus:border-primary/70"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Discord o Instagram <span className="text-primary">*</span>
          </span>
          <input
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
            required
            maxLength={120}
            placeholder="@usuario o tu tag de Discord"
            className="w-full rounded-xl border border-border/70 bg-surface/80 px-4 py-3 text-base text-text outline-none transition placeholder:text-muted/60 focus:border-primary/70"
          />
        </label>
      </div>

      <Field label="Experiencia" required>
        <div className="grid gap-2 sm:grid-cols-3">
          {EXPERIENCIA.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setExperiencia(opt.value)}
              aria-pressed={experiencia === opt.value}
              className={[
                "rounded-xl border px-4 py-3 text-left transition",
                experiencia === opt.value
                  ? "border-primary bg-primary/10"
                  : "border-border/70 bg-surface/60 hover:border-primary/60",
              ].join(" ")}
            >
              <div className="text-sm font-bold text-text">{opt.label}</div>
              <div className="text-[11px] text-muted">{opt.hint}</div>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Sistema preferido">
        <div className="flex flex-wrap gap-2">
          {SISTEMA.map((o) => (
            <Chip key={o.value} active={sistema === o.value} onClick={() => setSistema(o.value)}>
              {o.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Temática" hint="Elegí todas las que te tiren.">
        <div className="flex flex-wrap gap-2">
          {TEMATICA.map((o) => (
            <Chip
              key={o.value}
              active={tematicas.includes(o.value)}
              onClick={() => toggle(setTematicas, o.value)}
            >
              {o.label}
            </Chip>
          ))}
        </div>
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Modalidad">
          <div className="flex flex-wrap gap-2">
            {MODALIDAD.map((o) => (
              <Chip key={o.value} active={modalidad === o.value} onClick={() => setModalidad(o.value)}>
                {o.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Frecuencia">
          <div className="flex flex-wrap gap-2">
            {FRECUENCIA.map((o) => (
              <Chip key={o.value} active={frecuencia === o.value} onClick={() => setFrecuencia(o.value)}>
                {o.label}
              </Chip>
            ))}
          </div>
        </Field>
      </div>

      <Field label="Disponibilidad horaria" hint="Las que te sirvan.">
        <div className="flex flex-wrap gap-2">
          {DISPONIBILIDAD.map((o) => (
            <Chip
              key={o.value}
              active={disponibilidad.includes(o.value)}
              onClick={() => toggle(setDisponibilidad, o.value)}
            >
              {o.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field
        label="Líneas rojas"
        hint="Temas que preferís que la mesa evite. Se respetan sin preguntar por qué."
      >
        <div className="flex flex-wrap gap-2">
          {LINEAS_ROJAS.map((o) => (
            <Chip
              key={o.value}
              tone="ember"
              active={lineasRojas.includes(o.value)}
              onClick={() => toggle(setLineasRojas, o.value)}
            >
              {o.label}
            </Chip>
          ))}
        </div>
      </Field>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
          Algo más que quieras aclarar
        </span>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          maxLength={600}
          placeholder="Horarios raros, si venís con un amigo, qué te gustaría probar…"
          className="w-full resize-y rounded-xl border border-border/70 bg-surface/80 px-4 py-3 text-base text-text outline-none transition placeholder:text-muted/60 focus:border-primary/70"
        />
      </label>

      {status === "error" && error ? (
        <div className="rounded-xl border border-ember/50 bg-ember/10 p-4">
          <div className="text-sm font-semibold text-text/90">{error}</div>
          <FallbackContacts />
        </div>
      ) : null}

      <div className="space-y-2">
        <Button type="submit" disabled={!canSubmit} className="w-full rounded-xl px-5 py-4 text-base font-extrabold">
          {status === "sending" ? "Enviando…" : "Postularme"}
        </Button>
        <p className="text-center text-xs text-muted">
          Sólo usamos tus datos para contactarte por la mesa. Nada de spam.
        </p>
      </div>
    </form>
  );
}

export default RpgSignupForm;
