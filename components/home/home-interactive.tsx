"use client";

import * as React from "react";
import { Button, Card } from "@/components/ui";
import { Modal } from "@/components/modals/modal";

function Typewriter({ text }: { text: string }) {
  const [out, setOut] = React.useState("");
  React.useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 45);
    return () => window.clearInterval(id);
  }, [text]);
  return (
    <span>
      {out}
      <span className="ml-1 inline-block h-6 w-[3px] align-middle bg-[rgb(var(--primary))] animate-pulse" />
    </span>
  );
}

export function HomeInteractive() {
  const [prologue, setPrologue] = React.useState(false);
  const [rules, setRules] = React.useState(false);
  const [cinema, setCinema] = React.useState(false);
  const [quiz, setQuiz] = React.useState(false);

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)] md:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to bottom,rgba(0,0,0,.15) 0%,rgba(0,0,0,.55) 60%,rgba(0,0,0,1) 100%), url('https://cdn.nerdist.com/wp-content/uploads/2026/01/07083919/StrangerThings_S5_1000_R.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        />
        <div className="relative space-y-5">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight md:text-6xl">
            <span className="gold-gradient"><Typewriter text="La Mesa Perdida" /></span>
          </h1>
          <p className="max-w-2xl rounded-full border border-white/10 bg-black/60 px-5 py-3 text-base text-text/85 backdrop-blur md:text-lg">
            Stranger Things, Fantasía o Anime. Vos decidís el destino. Postulate ahora.
          </p>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button as="link" href="/simulador" className="w-full sm:w-auto">🎲 Simular historia</Button>
            <Button as="link" href="/creador" variant="ghost" className="w-full sm:w-auto">🧙 Crear personaje</Button>
            <Button as="link" href="/campanias" variant="ghost" className="w-full sm:w-auto">📝 Anotarme</Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer hover:border-primary/70" onClick={() => setPrologue(true)}>
              <div className="text-4xl">📜</div>
              <h3 className="mt-2 text-lg font-bold text-primary">Prólogo</h3>
              <p className="mt-1 text-sm text-text/75">El llamado. El pacto. El primer paso.</p>
            </Card>
            <Card className="cursor-pointer hover:border-primary/70" onClick={() => setCinema(true)}>
              <div className="text-4xl">🎬</div>
              <h3 className="mt-2 text-lg font-bold text-primary">Cine de la mesa</h3>
              <p className="mt-1 text-sm text-text/75">Mirá una partida real (video embebido).</p>
            </Card>
            <Card className="cursor-pointer hover:border-primary/70" onClick={() => setQuiz(true)}>
              <div className="text-4xl">🧩</div>
              <h3 className="mt-2 text-lg font-bold text-primary">Quiz</h3>
              <p className="mt-1 text-sm text-text/75">Descubrí tu clase/raza estilo mesa.</p>
            </Card>
          </div>

          <div className="mt-4 flex">
            <button
              className="text-sm text-text/70 underline decoration-primary/40 hover:text-primary"
              onClick={() => setRules(true)}
              type="button"
            >
              Ver reglas rápidas (qué es D&D y cómo se juega)
            </button>
          </div>
        </div>
      </section>

      {/* CTA fijo (mobile-first) */}
      <div className="fixed bottom-3 left-0 right-0 z-[1200] flex justify-center px-3 safe-bottom md:hidden">
        <Button as="link" href="/campanias" className="w-full max-w-[380px] py-3 text-base">
          📝 Postularme ahora
        </Button>
      </div>

      <Modal open={prologue} onClose={() => setPrologue(false)} title="El Llamado">
        <div className="space-y-3 text-text/85">
          <p>
            El mundo se está agrietando. Lo sentís en el aire: esa estática que no desaparece, las sombras que se alargan más de la cuenta cuando el sol cae.
          </p>
          <p>
            No buscamos héroes de leyenda. Buscamos a los que sobrevivieron cuando nadie más lo hizo. A los curiosos que miraron donde no debían.
          </p>
          <p className="font-semibold text-primary">¿Tenés el coraje para tirar los dados?</p>
          <div className="pt-2">
            <Button as="link" href="/campanias" className="w-full md:w-auto">Firmar el pacto</Button>
          </div>
        </div>
      </Modal>

      <Modal open={rules} onClose={() => setRules(false)} title="Reglas rápidas (en español)">
        <div className="space-y-3 text-text/85">
          <p><b className="text-primary">D&D</b> es un juego de rol: el DM describe el mundo, vos decís qué hacés, y si hay incertidumbre se tira un <b>d20</b>.</p>
          <p><b className="text-primary">Tirada:</b> d20 + modificador. Si superás la dificultad (DC), sale bien. Si no, hay consecuencias.</p>
          <p><b className="text-primary">Combate:</b> turnos simples (acción). Tu objetivo no es “ganar”: es crear una historia épica con tu mesa.</p>
          <Button as="link" href="/simulador" variant="ghost" className="w-full md:w-auto">Ir al simulador</Button>
        </div>
      </Modal>

      <Modal open={cinema} onClose={() => setCinema(false)} title="Cine de la mesa">
        <div className="space-y-3">
          <p className="text-sm text-text/75">Video vertical (short) para móvil. Podés cambiarlo en el código.</p>
          <div className="relative w-full overflow-hidden rounded-xl border border-border/60 bg-black shadow-[0_10px_25px_rgba(0,0,0,0.45)]">
            <div className="aspect-[9/16] w-full">
              <iframe
                className="h-full w-full"
                src="https://www.youtube.com/embed/7S8m8fXGvJY?rel=0&modestbranding=1&playsinline=1"
                title="Partida de rol"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={quiz} onClose={() => setQuiz(false)} title="¿Qué sos en la mesa? (mini-quiz)">
        <MiniQuiz />
      </Modal>
    </>
  );
}

function MiniQuiz() {
  const [step, setStep] = React.useState(0);
  const [cls, setCls] = React.useState<Record<string, number>>({});
  const [race, setRace] = React.useState<Record<string, number>>({});

  const questions = [
    { kind: "class" as const, q: "En una pelea, tu instinto es…", opts: [
      { t: "Ir al frente y bancar golpes", v: { Guerrero: 2 } },
      { t: "Moverme rápido y pegar donde duele", v: { Pícaro: 2 } },
      { t: "Controlar la situación con una jugada inteligente", v: { Mago: 2 } },
      { t: "Proteger al equipo y sostenerlos", v: { Clérigo: 2, Paladín: 1 } },
      { t: "Buscar altura/cobertura y jugar táctico", v: { Explorador: 2 } },
      { t: "Hablar, distraer y romper la tensión", v: { Bardo: 2 } },
    ]},
    { kind: "class" as const, q: "Cuando el grupo se traba, vos…", opts: [
      { t: "Decís “vamos” y arrancás", v: { Guerrero: 2 } },
      { t: "Organizás y marcás un rumbo", v: { Paladín: 2 } },
      { t: "Proponés una solución rara pero efectiva", v: { Mago: 2 } },
      { t: "Cuidás el clima y al equipo", v: { Clérigo: 2 } },
      { t: "Encontrás un atajo/oportunidad", v: { Pícaro: 2 } },
      { t: "Negociás y abrís puertas", v: { Bardo: 2 } },
    ]},
    { kind: "race" as const, q: "Físico y energía:", opts: [
      { t: "Aguante y terquedad", v: { Enano: 2, "Medio-Orco": 1 } },
      { t: "Agilidad y sentidos finos", v: { Elfo: 2, Semielfo: 1 } },
      { t: "Equilibrio total", v: { Humano: 2 } },
      { t: "Ligero y rápido", v: { Mediano: 2, Gnomo: 1 } },
      { t: "Presencia fuerte", v: { Dracónido: 2 } },
      { t: "Vibra distinta", v: { Tiefling: 2 } },
    ]},
    { kind: "race" as const, q: "Tu relación con la magia:", opts: [
      { t: "Natural: parte del mundo", v: { Elfo: 2, Gnomo: 1 } },
      { t: "Me atrae lo prohibido", v: { Tiefling: 2 } },
      { t: "La uso si sirve", v: { Humano: 2, Semielfo: 1 } },
      { t: "Prefiero lo real: acero", v: { Enano: 2, "Medio-Orco": 1 } },
      { t: "Poder ancestral", v: { Dracónido: 2 } },
      { t: "Suerte + timing", v: { Mediano: 2 } },
    ]},
  ];

  const cur = questions[step];

  function addScore(target: Record<string, number>, add: Record<string, number | undefined>) {
    const next = { ...target };
    for (const k of Object.keys(add)) next[k] = (next[k] ?? 0) + (add[k] ?? 0);
    return next;
  }

  function pick(v: Record<string, number | undefined>) {
    if (cur.kind === "class") setCls((s) => addScore(s, v));
    else setRace((s) => addScore(s, v));
    setStep((s) => Math.min(questions.length, s + 1));
  }

  function top(obj: Record<string, number>) {
    const entries = Object.entries(obj).sort((a,b)=>b[1]-a[1]);
    return entries[0]?.[0] ?? "—";
  }

  if (step >= questions.length) {
    return (
      <div className="space-y-4 text-text/85">
        <p>Tu resultado sugerido (rápido):</p>
        <div className="rounded-xl border border-border/60 bg-black/25 p-4">
          <div className="text-sm text-text/70">Clase</div>
          <div className="text-2xl font-extrabold text-primary">{top(cls)}</div>
          <div className="mt-3 text-sm text-text/70">Raza</div>
          <div className="text-2xl font-extrabold text-primary">{top(race)}</div>
        </div>
        <p className="text-sm text-text/70">Tip: En el Creador SRD podés terminar tu hoja con stats, skills y hechizos.</p>
        <Button as="link" href="/creador" className="w-full md:w-auto">Ir al creador</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-text/70">Pregunta {step+1} / {questions.length}</div>
      <div className="text-lg font-bold text-primary">{cur.q}</div>
      <div className="grid gap-2">
        {cur.opts.map((o, i) => (
          <button
            key={i}
            type="button"
            onClick={() => pick(o.v)}
            className="rounded-xl border border-border/60 bg-black/25 px-4 py-3 text-left text-sm text-text/90 hover:border-primary/70 hover:text-primary"
          >
            {o.t}
          </button>
        ))}
      </div>
    </div>
  );
}
