"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { VIDEOS } from "@/data/videos";
import RpgSignupForm from "@/components/forms/rpg-signup-form";

type ThemeCard = {
  title: string;
  icon: string;
  desc: string;
  bg: string;
  accent?: string;
};

const THEME_CARDS: ThemeCard[] = [
  {
    title: "Fantasía Épica",
    icon: "🐉",
    desc: "Dragones, espadas, juramentos. Clásico D&D / Tolkien, sin vueltas.",
    bg: "https://codexarcana.org/wp-content/uploads/2017/03/pathfinder_rpg_party_commission_by_skiorh-d8pog9q1-1024x724.png",
    accent: "rgba(212,175,55,.55)"
  },
  {
    title: "Mundo Mágico",
    icon: "🪄",
    desc: "Escuelas, casas, secretos… y un hechizo que salió mal.",
    bg: "https://www.gmbinder.com/images/dqekcCX.jpg",
    accent: "rgba(190,161,255,.45)"
  },
  {
    title: "Estilo Anime",
    icon: "⚡",
    desc: "Acción shonen: técnicas imposibles, rivalidad, hype y finales de capítulo.",
    bg: "https://media.tycsports.com/files/2024/10/04/772894/kimetsu-no-yaiba-vs-jujutsu-kaisen_862x485.webp",
    accent: "rgba(255,106,0,.45)"
  },
  {
    title: "Terror & Oscuridad",
    icon: "🕯️",
    desc: "Decisiones que pesan. Vibes Stranger Things / Hellfire, con tensión real.",
    bg: "https://static0.dualshockersimages.com/wordpress/wp-content/uploads/2025/07/stranger-things-welcome-to-the-hellfire-club-eddie.jpg",
    accent: "rgba(138,3,3,.55)"
  },
  {
    title: "Sci‑Fi / Cyberpunk",
    icon: "🚀",
    desc: "Neón, hackers, megacorporaciones. Si parpadeás, perdiste.",
    bg: "https://www.tribality.com/wp-content/uploads/2015/12/force-and-destiny-cover.jpg",
    accent: "rgba(0,220,255,.35)"
  }
];

function useLockBody(lock: boolean) {
  React.useEffect(() => {
    if (!lock) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lock]);
}

function Modal({
  open,
  onClose,
  title,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useLockBody(open);

  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/90 p-0 backdrop-blur md:items-center md:p-6">
      <div className="relative w-full max-w-3xl overflow-auto border border-border/60 bg-bg/95 p-5 md:rounded-2xl md:p-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md border border-border/60 bg-black/40 px-3 py-2 text-sm hover:border-primary/70 hover:text-primary"
          aria-label="Cerrar"
          type="button"
        >
          ✕
        </button>

        <h2 className="text-balance text-2xl font-extrabold text-primary md:text-3xl">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function YoutubeFrame({ id, title }: { id: string; title: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-black/40 pt-[56.25%]">
      <iframe
        className="absolute inset-0 h-full w-full"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        src={`https://www.youtube.com/embed/${id}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  desc
}: {
  eyebrow: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="mb-5 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[rgb(var(--primary))] shadow-[0_0_18px_rgba(212,175,55,.9)]" />
            {eyebrow}
          </span>
        </Badge>
      </div>
      <h2 className="text-balance text-2xl font-extrabold text-primary md:text-3xl">{title}</h2>
      {desc ? <p className="max-w-2xl text-sm text-text/80 md:text-base">{desc}</p> : null}
    </div>
  );
}

function Step({
  n,
  title,
  desc
}: {
  n: string;
  title: string;
  desc: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[rgba(212,175,55,.10)] blur-2xl" />
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-black/40 text-lg font-extrabold text-primary">
          {n}
        </div>
        <div className="space-y-1">
          <div className="text-base font-bold text-text">{title}</div>
          <div className="text-sm text-text/80">{desc}</div>
        </div>
      </div>
    </Card>
  );
}

function Quote({ text, who }: { text: string; who: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_60%_at_20%_10%,black,transparent)]">
        <div className="aurora" />
      </div>
      <div className="relative space-y-2">
        <div className="text-lg leading-relaxed text-text/90">“{text}”</div>
        <div className="text-xs font-semibold text-text/70">— {who}</div>
      </div>
    </Card>
  );
}

function FaqItem({
  q,
  a
}: {
  q: string;
  a: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-bold text-text md:text-base">{q}</span>
        <span className="text-primary">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="border-t border-border/60 px-5 pb-5 pt-3 text-sm text-text/80">{a}</div> : null}
    </Card>
  );
}

function QuizContent({ onSignup }: { onSignup: () => void }) {
  const Q = [
    {
      q: "1) En una pelea, tu primer instinto es…",
      a: [
        { t: "Ir al frente y bancar golpes.", c: "Guerrero" },
        { t: "Moverme rápido y pegar donde duele.", c: "Pícaro" },
        { t: "Proteger y curar al equipo.", c: "Clérigo" },
        { t: "Resolver con magia/estrategia.", c: "Mago" }
      ]
    },
    {
      q: "2) ¿Qué te da más hype en una sesión?",
      a: [
        { t: "Boss fight y loot.", c: "Acción" },
        { t: "Roleo y diálogos memorables.", c: "Narrativa" },
        { t: "Resolver enigmas.", c: "Misterio" },
        { t: "Planear como ajedrez.", c: "Estrategia" }
      ]
    },
    {
      q: "3) Si te doy una misión imposible…",
      a: [
        { t: "La acepto, total algo sale.", c: "Valiente" },
        { t: "Pregunto todo antes de moverme.", c: "Precavido" },
        { t: "Busco atajos y trampas.", c: "Astuto" },
        { t: "Hago un plan con el grupo.", c: "Líder" }
      ]
    }
  ];

  const [idx, setIdx] = React.useState(0);
  const [tags, setTags] = React.useState<string[]>([]);

  const current = Q[idx];
  const done = idx >= Q.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text/80">
        Te toma <span className="font-semibold text-primary">20 segundos</span>. Al final te tiramos un “perfil de mesa”
        y si te pinta, te postulás.
      </p>

      {!done ? (
        <Card className="space-y-3">
          <div className="text-sm font-bold text-text">{current.q}</div>
          <div className="grid gap-2">
            {current.a.map((opt) => (
              <button
                key={opt.t}
                type="button"
                className="group rounded-xl border border-border/70 bg-black/30 px-4 py-3 text-left text-sm text-text/90 transition hover:border-primary/70 hover:bg-black/50"
                onClick={() => {
                  setTags((t) => [...t, opt.c]);
                  setIdx((i) => i + 1);
                }}
              >
                <span className="font-semibold text-primary group-hover:text-white">{opt.c}</span>{" "}
                <span className="text-text/80">— {opt.t}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-text/70">
            <span>
              Paso {idx + 1} / {Q.length}
            </span>
            <span className="h-1 w-24 overflow-hidden rounded-full bg-black/50">
              <span
                className="block h-full bg-[rgb(var(--primary))]"
                style={{ width: `${((idx + 1) / Q.length) * 100}%` }}
              />
            </span>
          </div>
        </Card>
      ) : (
        <Card className="space-y-3">
          <div className="text-sm font-bold text-text">Tu vibra de mesa:</div>
          <div className="flex flex-wrap gap-2">
            {tags.map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="rounded-full border border-border/70 bg-black/40 px-3 py-1 text-xs font-semibold text-primary"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="text-sm text-text/80">
            Si esto te movió algo… entonces estás a <span className="font-semibold text-primary">un click</span> de tu
            próxima obsesión.
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              onClick={onSignup}
              type="button"
            >
              Postularme ahora
            </Button>
            <Button
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => {
                setIdx(0);
                setTags([]);
              }}
              type="button"
            >
              Rehacer test
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function MesaHome() {
  const [signup, setSignup] = React.useState(false);
  const [quiz, setQuiz] = React.useState(false);
  const [trailer, setTrailer] = React.useState(false);

  const topVideos = React.useMemo(() => VIDEOS.slice(0, 3), []);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/40 p-5 shadow-[0_30px_90px_rgba(0,0,0,0.60)] md:p-10">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(to bottom,rgba(0,0,0,.10) 0%,rgba(0,0,0,.65) 55%,rgba(0,0,0,1) 100%), url('https://cdn.nerdist.com/wp-content/uploads/2026/01/07083919/StrangerThings_S5_1000_R.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          />
          <div className="absolute inset-0 opacity-70 [mask-image:radial-gradient(65%_60%_at_20%_0%,black,transparent)]">
            <div className="aurora" />
          </div>
          <div className="grain" />
        </div>

        <div className="relative">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-4">
              <Badge>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[rgb(var(--primary))] shadow-[0_0_18px_rgba(212,175,55,.9)]" />
                  Convocatoria 2026 · Mendoza / Online
                </span>
              </Badge>

              <h1 className="text-balance text-4xl font-extrabold leading-[1.05] md:text-6xl">
                <span className="gold-gradient">La Mesa Perdida</span>
                <span className="block text-text/90">Te falta una sesión para decir “WOW”.</span>
              </h1>

              <p className="max-w-xl text-sm text-text/85 md:text-base">
                No es “ver una serie”. Es estar adentro. Elegí tu vibra, conocé gente piola y viví una historia que no
                se repite. Si entrás… <span className="font-semibold text-primary">ya no volvés igual</span>.
              </p>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button className="w-full sm:w-auto" onClick={() => setQuiz(true)} type="button">
                  Hacer el test (20s)
                </Button>
                <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setSignup(true)} type="button">
                  Postularme
                </Button>
                <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setTrailer(true)} type="button">
                  Ver trailer
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center md:max-w-lg md:gap-3">
                <div className="rounded-2xl border border-border/60 bg-black/35 px-3 py-3">
                  <div className="text-lg font-extrabold text-primary md:text-xl">100%</div>
                  <div className="text-[11px] text-text/70 md:text-xs">interactiva</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-black/35 px-3 py-3">
                  <div className="text-lg font-extrabold text-primary md:text-xl">0</div>
                  <div className="text-[11px] text-text/70 md:text-xs">spoilers</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-black/35 px-3 py-3">
                  <div className="text-lg font-extrabold text-primary md:text-xl">+1</div>
                  <div className="text-[11px] text-text/70 md:text-xs">party member</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:w-[380px]">
              <Card className="border-primary/30 bg-black/35">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-text">¿Nunca jugaste?</div>
                  <span className="text-primary">✔</span>
                </div>
                <p className="mt-1 text-sm text-text/80">
                  Entrás igual. Te guiamos paso a paso, sin vergüenza, sin elitismo.
                </p>
              </Card>

              <Card className="border-border/60 bg-black/35">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-text">¿Buscás algo serio?</div>
                  <span className="text-primary">⚔️</span>
                </div>
                <p className="mt-1 text-sm text-text/80">
                  Historias con peso. Combate, rol, decisiones… y consecuencias.
                </p>
              </Card>

              <Card className="border-border/60 bg-black/35">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-text">¿Cómo arranco?</div>
                  <span className="text-primary">➜</span>
                </div>
                <p className="mt-1 text-sm text-text/80">
                  Hacé el test y completá el formulario. Si matchea: te hablamos.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mt-10">
        <SectionTitle
          eyebrow="simple y rápido"
          title="Entrás en 3 pasos"
          desc="Diseñado para celular primero. Sin vueltas: si te pinta, te sumás."
        />
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          <Step n="1" title="Elegí tu vibra" desc="Fantasía, anime, terror… o mezcla. Vos marcás el tono." />
          <Step n="2" title="Postulate" desc="Formulario cortito. Tus gustos + disponibilidad. Listo." />
          <Step n="3" title="Match & sesión 0" desc="Te contactamos, armamos grupo y arrancamos con todo." />
        </div>
      </section>

      {/* THEMES */}
      <section className="mt-10">
        <SectionTitle
          eyebrow="la vibra manda"
          title="¿Qué historia te pega hoy?"
          desc="Elegí una carta. No es solo estética: cambia el tipo de escenas, desafíos y momentos memorables."
        />

        <div className="relative">
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0">
            {THEME_CARDS.map((t) => (
              <div key={t.title} className="min-w-[84%] snap-center md:min-w-0">
                <Card className="group relative h-full overflow-hidden p-0">
                  <div
                    className="absolute inset-0 opacity-80 transition duration-500 group-hover:scale-[1.03]"
                    style={{
                      backgroundImage: `linear-gradient(to bottom,rgba(0,0,0,.05) 0%,rgba(0,0,0,.78) 60%,rgba(0,0,0,1) 100%), url('${t.bg}')`,
                      backgroundSize: "cover",
                      backgroundPosition: "center"
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-60"
                    style={{
                      background:
                        `radial-gradient(70% 55% at 15% 0%, ${t.accent ?? "rgba(212,175,55,.45)"} 0%, transparent 65%)`
                    }}
                  />
                  <div className="relative flex h-full flex-col justify-between gap-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-lg font-extrabold text-primary">{t.title}</div>
                        <div className="text-sm text-text/85">{t.desc}</div>
                      </div>
                      <div className="text-2xl">{t.icon}</div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text/70">Deslizá para ver más</span>
                      <button
                        type="button"
                        className="rounded-full border border-border/70 bg-black/35 px-4 py-2 text-xs font-semibold text-primary transition hover:border-primary/70 hover:text-white"
                        onClick={() => setSignup(true)}
                      >
                        Me anoto
                      </button>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-text/70 md:hidden">
            <span>Tip: deslizá ➜</span>
            <Link href="/campanias" className="text-primary underline-offset-4 hover:underline">
              Ver campañas
            </Link>
          </div>
        </div>
      </section>

      {/* TRAILER / VIDEOS */}
      <section className="mt-10">
        <SectionTitle
          eyebrow="un vistazo"
          title="Videos para entrar en mood"
          desc="Si te agarra la manija con esto, estás listo. Tenés sección completa de videos también."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_60%_at_20%_0%,black,transparent)]">
              <div className="aurora" />
            </div>
            <div className="relative space-y-3">
              <div className="text-sm font-bold text-text">Mini‑trailer</div>
              {/* CuratedVideo usa youtubeId (ver data/videos.ts). */}
              <YoutubeFrame
                id={topVideos[0]?.youtubeId ?? "dQw4w9WgXcQ"}
                title={topVideos[0]?.title ?? "Trailer"}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="w-full sm:w-auto" onClick={() => setSignup(true)} type="button">
                  Quiero entrar
                </Button>
                <Button as="link" href="/videos" variant="ghost" className="w-full sm:w-auto">
                  Ver más videos
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            {topVideos.slice(1).map((v) => (
              <Card key={v.youtubeId} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-text">{v.title}</div>
                  <span className="text-xs text-text/60">YouTube</span>
                </div>
                <YoutubeFrame id={v.youtubeId} title={v.title} />
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="mt-10">
        <SectionTitle
          eyebrow="lo que pasa en serio"
          title="Lo que la gente dice después"
          desc="Spoiler: nadie sale igual. Y eso es lo mejor."
        />
        <div className="grid gap-4 md:grid-cols-3">
          <Quote text="Entré por curiosidad. Me quedé porque fue la primera vez que sentí que “yo era el personaje”." who="Jugador (primer mesa)" />
          <Quote text="Me daba vergüenza rolear. A la segunda sesión ya estaba gritando hechizos como si fuera normal." who="Jugadora (0 experiencia)" />
          <Quote text="Es como Stranger Things… pero vos sos parte del Hellfire. Y encima conocés gente copada." who="Jugador (fan ST)" />
        </div>
      </section>

      {/* SIGNUP CTA */}
      <section className="mt-10" id="postularme">
        <SectionTitle
          eyebrow="último paso"
          title="Postulate y hacelo real"
          desc="Formulario corto. Si tu perfil encaja con la mesa y horarios, te escribimos."
        />
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_55%_at_30%_0%,black,transparent)]">
            <div className="aurora" />
          </div>
          <div className="relative grid gap-6 md:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              <div className="text-sm font-bold text-text">Formulario</div>
              <RpgSignupForm />
            </div>

            <div className="space-y-3">
              <div className="text-sm font-bold text-text">Antes de enviar</div>

              <div className="space-y-2 text-sm text-text/80">
                <div className="rounded-xl border border-border/60 bg-black/30 p-4">
                  <div className="font-semibold text-primary">Regla #1</div>
                  <div>Venís a pasarla bien. Respeto, consentimiento y buena onda.</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-black/30 p-4">
                  <div className="font-semibold text-primary">Regla #2</div>
                  <div>Si no podés, avisás. La mesa se cuida como party.</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-black/30 p-4">
                  <div className="font-semibold text-primary">Regla #3</div>
                  <div>No necesitás saber nada. Solo ganas.</div>
                </div>
              </div>

              <div className="pt-1">
                <Button as="link" href="/simulador" variant="ghost" className="w-full">
                  Probá el simulador ➜
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <SectionTitle
          eyebrow="preguntas rápidas"
          title="FAQ"
          desc="Lo que siempre preguntan antes de entrar."
        />
        <div className="grid gap-3 md:grid-cols-2">
          <FaqItem
            q="¿Tengo que saber jugar?"
            a="No. Te guiamos. Si sabés, joya. Si no, también."
          />
          <FaqItem
            q="¿Es online o presencial?"
            a={
              <>
                Hay mesas online y presenciales (Mendoza). En el formulario marcás lo que preferís y vemos match.
              </>
            }
          />
          <FaqItem
            q="¿Cuánto dura una sesión?"
            a="En general 2–4 horas. Lo definimos con el grupo para que sea sostenible."
          />
          <FaqItem
            q="¿Qué necesito?"
            a="Celular/PC + ganas. El resto lo ponemos nosotros."
          />
        </div>
      </section>

      {/* Sticky mobile CTA */}
      <div className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-black/70 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl border border-primary/60 bg-black/50 px-4 py-3 text-sm font-extrabold text-primary shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
            onClick={() => setQuiz(true)}
          >
            Test (20s)
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl border border-border/70 bg-black/40 px-4 py-3 text-sm font-extrabold text-text hover:border-primary/70 hover:text-primary"
            onClick={() => setSignup(true)}
          >
            Postularme
          </button>
        </div>
      </div>

      {/* Modals */}
      <Modal open={signup} onClose={() => setSignup(false)} title="Postulate">
        <RpgSignupForm />
      </Modal>

      <Modal open={quiz} onClose={() => setQuiz(false)} title="Test rápido (20s)">
        <QuizContent
          onSignup={() => {
            setQuiz(false);
            setSignup(true);
          }}
        />
      </Modal>

      <Modal open={trailer} onClose={() => setTrailer(false)} title="Trailer">
        <YoutubeFrame id={topVideos[0]?.youtubeId ?? "dQw4w9WgXcQ"} title={topVideos[0]?.title ?? "Trailer"} />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button className="w-full sm:w-auto" onClick={() => setSignup(true)} type="button">
            Me sumo
          </Button>
          <Button as="link" href="/videos" variant="ghost" className="w-full sm:w-auto">
            Ver más
          </Button>
        </div>
      </Modal>
    </>
  );
}
