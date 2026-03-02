"use client";

import * as React from "react";
import { Button, Card, Input, Select, Textarea } from "@/components/ui";
import { CAMPAIGNS } from "@/data/campaigns";

const GOOGLE_FORM_ACTION = "https://docs.google.com/forms/d/e/1FAIpQLScP2cSEbMdsVes4w8f1frB9hZSwP7xFsXjaY_Smm6AcGJsq3A/formResponse";
const ENTRY = {
  "campaignSlug": "entry.592377339",
  "fullName": "entry.1145937670",
  "age": "entry.1662985932",
  "contact": "entry.259189639",
  "country": "entry.1977972677",
  "availability": "entry.430852753",
  "experience": "entry.2000145625",
  "role": "entry.432896089",
  "prefs": "entry.876431454",
  "linesVeils": "entry.2140878283"
};

type Props = {
  defaultCampaignSlug?: string;
  compact?: boolean;
};

function fmtGenre(g: any) {
  return Array.isArray(g) ? g.join(" / ") : String(g ?? "");
}

/**
 * Formulario propio (UI del sitio) que envía los datos al Google Forms
 * mediante POST a un iframe oculto (patrón clásico, sin CORS) — como en el index original.
 */
export default function RpgSignupForm({ defaultCampaignSlug, compact }: Props) {
  const [submitted, setSubmitted] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!GOOGLE_FORM_ACTION) return;
    e.preventDefault();
    setSending(true);

    try {
      (e.currentTarget as HTMLFormElement).submit();
      setSubmitted(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className={compact ? "p-4" : "p-5"}>
      <div className="space-y-1">
        <div className="text-lg font-bold text-primary">Hoja de inscripción</div>
        <p className="text-sm text-text/80">
          Cuestionario propio del sitio. Se envía al Google Form (como en el index original).
        </p>
      </div>

      {submitted ? (
        <div className="mt-4 rounded-xl border border-border/60 bg-card/60 p-4">
          <div className="font-bold text-primary">¡Enviado! ✅</div>
          <p className="mt-1 text-sm text-text/80">
            Recibimos tu inscripción. Si querés, podés enviar otra respuesta.
          </p>
          <div className="mt-3">
            <Button onClick={() => setSubmitted(false)} className="w-full sm:w-auto">
              Enviar otra
            </Button>
          </div>
        </div>
      ) : (
        <>
          <iframe name="hidden_iframe" className="hidden" />

          <form
            action={GOOGLE_FORM_ACTION || undefined}
            method="POST"
            target="hidden_iframe"
            onSubmit={onSubmit}
            className="mt-4 space-y-4"
          >
            <Select
              name={ENTRY.campaignSlug || ENTRY.prefs}
              label="Campaña (ejemplo)"
              defaultValue={defaultCampaignSlug || ""}
              options={[
                { value: "", label: "Elegir campaña (opcional)" },
                ...CAMPAIGNS.map((c) => ({ value: c.slug, label: `${c.title} — ${fmtGenre(c.genre)}` })),
              ]}
            />

            <Input name={ENTRY.fullName} label="Nombre y apellido" placeholder="Ej: Emmanuel Coll" required />
            <Input name={ENTRY.age} label="Edad (opcional)" placeholder="Ej: 26" inputMode="numeric" />

            <Input
              name={ENTRY.contact}
              label="Discord o WhatsApp"
              placeholder="Ej: @usuario / +54 261..."
              required
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input name={ENTRY.country} label="Zona / País" placeholder="Ej: Mendoza, AR" />
              <Input name={ENTRY.availability} label="Disponibilidad horaria" placeholder="Ej: Lun-Jue 20:00" />
            </div>

            <Select
              name={ENTRY.experience}
              label="Experiencia"
              options={[
                { value: "Nuevo", label: "Nuevo" },
                { value: "Intermedio", label: "Intermedio" },
                { value: "Avanzado", label: "Avanzado" },
              ]}
              defaultValue="Nuevo"
            />

            <Select
              name={ENTRY.role}
              label="Rol deseado"
              options={[
                { value: "Jugador", label: "Jugador" },
                { value: "DM", label: "DM" },
                { value: "Flexible", label: "Flexible" },
              ]}
              defaultValue="Jugador"
            />

            <Textarea
              name={ENTRY.prefs}
              label="Preferencias de campaña"
              placeholder="Ej: Fantasía épica, horror suave, humor, etc."
              rows={compact ? 3 : 4}
            />

            <Textarea
              name={ENTRY.linesVeils}
              label="Límites / líneas y velos (opcional)"
              placeholder="Este campo es sensible. Ej: evitar gore explícito, etc."
              rows={compact ? 3 : 4}
            />

            <Button type="submit" className="w-full sm:w-auto" disabled={sending}>
              {sending ? "Enviando..." : "Enviar inscripción"}
            </Button>

            {!GOOGLE_FORM_ACTION && (
              <p className="text-xs text-yellow-200/80">
                Aviso: no se detectó la URL del Google Form. Subí/actualizá index.html o cargá la URL en este archivo.
              </p>
            )}
          </form>
        </>
      )}
    </Card>
  );
}
