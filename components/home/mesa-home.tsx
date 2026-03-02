"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { VIDEOS } from "@/data/videos";
import { RpgSignupForm } from "@/components/forms/rpg-signup-form";

type ThemeCard = { title: string; icon: string; desc: string; bg: string };

const THEME_CARDS: ThemeCard[] = [
  {
    title: "Fantasía Épica",
    icon: "🐉",
    desc: "Dragones, espadas y magia. Estilo clásico D&D / El Señor de los Anillos.",
    bg: "https://codexarcana.org/wp-content/uploads/2017/03/pathfinder_rpg_party_commission_by_skiorh-d8pog9q1-1024x724.png"
  },
  {
    title: "Mundo Mágico",
    icon: "🪄",
    desc: "Escuelas de magia, misterios y secretos bajo la superficie.",
    bg: "https://www.gmbinder.com/images/dqekcCX.jpg"
  },
  {
    title: "Estilo Anime",
    icon: "⚡",
    desc: "Acción shonen: técnicas especiales, exorcistas, demonios y adrenalina.",
    bg: "https://media.tycsports.com/files/2024/10/04/772894/kimetsu-no-yaiba-vs-jujutsu-kaisen_862x485.webp"
  },
  {
    title: "Terror & Oscuridad",
    icon: "🕯️",
    desc: "Misterio, tensión y decisiones que pesan. Vibes Stranger Things / Hellfire.",
    bg: "https://static0.dualshockersimages.com/wordpress/wp-content/uploads/2025/07/stranger-things-welcome-to-the-hellfire-club-eddie.jpg"
  },
  {
    title: "Sci‑Fi / Cyberpunk",
    icon: "🚀",
    desc: "Naves, neón, hackers y futuros rotos.",
    bg: "https://www.tribality.com/wp-content/uploads/2015/12/force-and-destiny-cover.jpg"
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

function QuizContent() {
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
        { t: "Combate épico y escenas de acción.", c: "Guerrero" },
        { t: "Infiltración, secretos y giros.", c: "Pícaro" },
        { t: "Roleo, dilemas y decisiones.", c: "Clérigo" },
        { t: "Puzzles, lore y hechizos.", c: "Mago" }
      ]
    },
    {
      q: "3) Tu rol ideal en el grupo…",
      a: [
        { t: "Tanque / frontliner.", c: "Guerrero" },
        { t: "Scout / especialista.", c: "Pícaro" },
        { t: "Soporte / corazón del equipo.", c: "Clérigo" },
        { t: "Control / daño mágico.", c: "Mago" }
      ]
    }
  ] as const;

  const [i, setI] = React.useState(0);
  const [scores, setScores] = React.useState<Record<string, number>>({});

  const done = i >= Q.length;

  function pick(cls: string) {
    setScores((s) => ({ ...s, [cls]: (s[cls] ?? 0) + 1 }));
    setI((x) => x + 1);
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Aventurero";

  return (
    <div className="space-y-4">
      {!done ? (
        <>
          <div className="text-sm text-text/70">
            Pregunta {i + 1} / {Q.length}
          </div>
          <div className="text-lg font-extrabold">{Q[i].q}</div>
          <div className="grid gap-2">
            {Q[i].a.map((a) => (
              <button
                key={a.t}
                type="button"
                onClick={() => pick(a.c)}
                className="rounded-xl border border-border/60 bg-black/20 px-4 py-3 text-left text-sm hover:border-primary/70 hover:bg-black/30"
              >
                {a.t}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-black/20 p-4">
          <div className="text-sm text-text/70">Resultado</div>
          <div className="mt-1 text-2xl font-extrabold text-primary">{best}</div>
          <p className="mt-2 text-text/80">
            Mini‑quiz (sin IA, sin keys). Si querés, probá el simulador para ver decisiones + tiradas en acción.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button as="link" href="/simulador" className="w-full sm:w-auto">
              Probar simulador
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setI(0); setScores({}); }} className="w-full sm:w-auto">
              Repetir
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MesaHome() {
  const [img, setImg] = React.useState<{ title: string; bg: string } | null>(null);
  const [openPrologue, setOpenPrologue] = React.useState(false);
  const [openCinema, setOpenCinema] = React.useState(false);
  const [openRules, setOpenRules] = React.useState(false);
  const [openForm, setOpenForm] = React.useState(false);
  const [openQuiz, setOpenQuiz] = React.useState(false);

  const indexVideos = [
    { id: "DPTihWkXtEE", title: "Video del index — Intro" },
    { id: "YJbaGMvydS4", title: "Video del index — Checklist" },
    { id: "PJxd_s-VMmQ", title: "Video del index — Clip" }
  ];

  const mainVideo = VIDEOS.find((v) => v.category === "Campañas")?.youtubeId ?? VIDEOS[0]?.youtubeId ?? "fUdwmhtmk1g";

  return (
    <div className="space-y-14">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur md:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(0,0,0,.25) 0%, rgba(0,0,0,.75) 60%, rgba(0,0,0,1) 100%), url('https://cdn.nerdist.com/wp-content/uploads/2026/01/07083919/StrangerThings_S5_1000_R.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
          aria-hidden
        />
        <div className="relative">
          <Badge>Convocatoria de Rol</Badge>
          <h1 className="mt-4 text-balance text-4xl font-black md:text-6xl">
            La Mesa <span className="text-primary">Perdida</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-text/85 md:text-lg">
            Stranger Things, Fantasía, Terror, Anime o Sci‑Fi. Vos elegís el tono: el destino responde.
          </p>

          <div className="mt-6 grid gap-3 sm:flex sm:flex-row sm:flex-wrap">
            <Button onClick={() => setOpenForm(true)} variant="primary" className="w-full sm:w-auto">
              UNIRSE AHORA
            </Button>
            <Button onClick={() => setOpenPrologue(true)} className="w-full sm:w-auto">
              LEER EL PRÓLOGO
            </Button>
            <Button onClick={() => setOpenCinema(true)} variant="ghost" className="w-full sm:w-auto">
              CINE DE LA MESA
            </Button>
            <Button onClick={() => setOpenQuiz(true)} variant="ghost" className="w-full sm:w-auto">
              QUIZ / ENCUESTA
            </Button>
            <Button onClick={() => setOpenRules(true)} variant="ghost" className="w-full sm:w-auto">
              REGLAS RÁPIDAS
            </Button>
            <Button as="link" href="/simulador" variant="ghost" className="w-full sm:w-auto">
              PROBAR SIMULADOR
            </Button>
          </div>

          <div className="mt-6 flex flex-col gap-2 text-sm text-text/70 sm:flex-row sm:items-center">
            <Link className="hover:text-primary" href="/videos">
              Ver videos
            </Link>
            <span className="hidden sm:inline">•</span>
            <Link className="hover:text-primary" href="/creador">
              Crear personaje
            </Link>
            <span className="hidden sm:inline">•</span>
            <Link className="hover:text-primary" href="/campanias">
              Campañas
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-extrabold md:text-3xl">Elegí tu destino</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {THEME_CARDS.map((c) => (
            <Card
              key={c.title}
              role="button"
              tabIndex={0}
              onClick={() => setImg({ title: c.title, bg: c.bg })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setImg({ title: c.title, bg: c.bg });
              }}
              className="cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="text-lg font-extrabold">{c.title}</div>
                <div className="text-2xl">{c.icon}</div>
              </div>
              <div className="text-sm text-text/75">{c.desc}</div>
              <div className="text-xs text-text/60">Toque para ver imagen</div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-extrabold md:text-3xl">Video Vault</h2>
        <p className="max-w-3xl text-text/80">
          Los videos que estaban en el index original (más la lista completa en{" "}
          <Link className="text-primary underline" href="/videos">
            /videos
          </Link>
          ).
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {indexVideos.map((v) => (
            <Card key={v.id} className="space-y-3">
              <div className="text-sm font-semibold">{v.title}</div>
              <YoutubeFrame id={v.id} title={v.title} />
            </Card>
          ))}
        </div>
      </section>

      <Modal open={!!img} onClose={() => setImg(null)} title={img?.title ?? ""}>
        {img ? (
          <div className="space-y-4">
            <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-black/40 pt-[56.25%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.bg} alt={img.title} className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <Button onClick={() => setImg(null)} className="w-full">
              Cerrar
            </Button>
          </div>
        ) : null}
      </Modal>

      <Modal open={openPrologue} onClose={() => setOpenPrologue(false)} title="Prólogo">
        <div className="space-y-4 text-text/85">
          <p>
            El mundo se está agrietando. Lo sentís en el aire: esa estática que no desaparece, las sombras que se alargan
            cuando cae el sol.
          </p>
          <p>La Mesa Perdida no es solo un juego. Es un pacto. ¿Tenés el coraje para tirar los dados?</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => { setOpenPrologue(false); setOpenForm(true); }} className="w-full sm:w-auto">
              UNIRSE AHORA
            </Button>
            <Button onClick={() => setOpenPrologue(false)} variant="ghost" className="w-full sm:w-auto">
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={openCinema} onClose={() => setOpenCinema(false)} title="Cine de la Mesa">
        <p className="text-text/80">Mirá un ejemplo real para captar el ritmo: escenas, decisiones, tiradas y consecuencias.</p>
        <div className="mt-4">
          <YoutubeFrame id={mainVideo} title="Ejemplo" />
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button as="link" href="/videos" className="w-full sm:w-auto">
            Ver lista completa
          </Button>
          <Button onClick={() => setOpenCinema(false)} variant="ghost" className="w-full sm:w-auto">
            Cerrar
          </Button>
        </div>
      </Modal>

      <Modal open={openRules} onClose={() => setOpenRules(false)} title="Reglas rápidas">
        <div className="space-y-3 text-text/85">
          <p>
            <b className="text-primary">1)</b> Decís qué querés hacer.
          </p>
          <p>
            <b className="text-primary">2)</b> El DM describe el mundo y pide una tirada si hace falta.
          </p>
          <p>
            <b className="text-primary">3)</b> Tirás d20 + modificadores → si superás la DC, sale; si no, hay consecuencia.
          </p>
          <p>
            <b className="text-primary">4)</b> En combate: turnos, acción y táctica.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button as="link" href="/simulador" className="w-full sm:w-auto">
              Probar simulador
            </Button>
            <Button as="link" href="/creador" variant="ghost" className="w-full sm:w-auto">
              Crear PJ
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={openQuiz} onClose={() => setOpenQuiz(false)} title="¿Qué sos en la mesa?">
        <QuizContent />
      </Modal>

      <Modal open={openForm} onClose={() => setOpenForm(false)} title="Hoja de inscripción">
        <RpgSignupForm />
        <div className="mt-4">
          <Button onClick={() => setOpenForm(false)} variant="ghost" className="w-full">
            Volver a la taberna
          </Button>
        </div>
      </Modal>
    </div>
  );
}
