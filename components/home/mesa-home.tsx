"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { VIDEOS } from "@/data/videos";

type Campaign = { id: number; title: string; slug: string; is_open: boolean; description: string };

const THEME_CARDS = [
  {
    title: "Fantasía Épica",
    icon: "🐉",
    desc: "Dragones, espadas y magia. Estilo clásico D&D / El Señor de los Anillos.",
    bg: "https://codexarcana.org/wp-content/uploads/2017/03/pathfinder_rpg_party_commission_by_skiorh-d8pog9q1-1024x724.png"
  },
  {
    title: "Mundo Mágico",
    icon: "🪄",
    desc: "Escuelas de magia, misterios juveniles y secretos bajo la superficie.",
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
    desc: "Naves, neón, hackers, cazarrecompensas, conspiraciones y futuros rotos.",
    bg: "https://www.tribality.com/wp-content/uploads/2015/12/force-and-destiny-cover.jpg"
  }
];

function useLockBody(lock: boolean) {
  React.useEffect(() => {
    if (!lock) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
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
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
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

function YoutubeFrame({ id }: { id: string }) {
  return (
    <div className="relative mt-4 w-full overflow-hidden rounded-2xl border border-border/60 bg-black/40 pt-[56.25%]">
      <iframe
        className="absolute inset-0 h-full w-full"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        src={`https://www.youtube.com/embed/${id}`}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

export default function MesaHome() {
  const [img, setImg] = React.useState<{ title: string; bg: string } | null>(null);
  const [openPrologue, setOpenPrologue] = React.useState(false);
  const [openCinema, setOpenCinema] = React.useState(false);
  const [openRules, setOpenRules] = React.useState(false);
  const [openForm, setOpenForm] = React.useState(false);

  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = React.useState<number | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = React.useState(false);

  // carga campañas para el modal form
  React.useEffect(() => {
    if (!openForm) return;
    let alive = true;
    (async () => {
      setLoadingCampaigns(true);
      try {
        const res = await fetch("/api/campaigns", { cache: "no-store" });
        const data = await res.json();
        const list = Array.isArray(data) ? (data as Campaign[]) : [];
        if (!alive) return;
        setCampaigns(list);
        const open = list.find((c) => c.is_open);
        setCampaignId(open?.id ?? list[0]?.id ?? null);
      } catch {
        if (!alive) return;
        setCampaigns([]);
        setCampaignId(null);
      } finally {
        if (alive) setLoadingCampaigns(false);
      }
    })();
    return () => { alive = false; };
  }, [openForm]);

  const mainVideo = VIDEOS[0]?.youtubeId || "fUdwmhtmk1g";

  return (
    <div className="space-y-14">
      {/* HERO */}
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
            Stranger Things, Fantasía o Anime. Vos decidís el destino. Postulate ahora.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button onClick={() => setOpenPrologue(true)} className="w-full sm:w-auto">
              El Llamado
            </Button>
            <Button onClick={() => setOpenForm(true)} variant="primary" className="w-full sm:w-auto">
              Firmar el Pacto
            </Button>
            <Button onClick={() => setOpenCinema(true)} variant="ghost" className="w-full sm:w-auto">
              Cine de la Mesa
            </Button>
            <Button onClick={() => setOpenRules(true)} variant="ghost" className="w-full sm:w-auto">
              Reglas rápidas
            </Button>
            <Button as="link" href="/simulador" variant="ghost" className="w-full sm:w-auto">
              Probar simulador
            </Button>
          </div>

          <div className="mt-6 flex flex-col gap-2 text-sm text-text/70 sm:flex-row sm:items-center">
            <Link className="hover:text-primary" href="/videos">Ver videos</Link>
            <span className="hidden sm:inline">•</span>
            <Link className="hover:text-primary" href="/creador">Crear personaje</Link>
            <span className="hidden sm:inline">•</span>
            <Link className="hover:text-primary" href="/campanias">Campañas</Link>
          </div>
        </div>
      </section>

      {/* OPTIONS GRID */}
      <section className="space-y-6">
        <h2 className="text-2xl font-extrabold md:text-3xl">Elegí tu destino</h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {THEME_CARDS.map((c) => (
            <Card
              key={c.title}
              role="button"
              tabIndex={0}
              onClick={() => setImg({ title: c.title, bg: c.bg })}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setImg({ title: c.title, bg: c.bg }); }}
              className="cursor-pointer space-y-2"
            >
              <div className="text-4xl">{c.icon}</div>
              <div className="text-lg font-bold text-primary">{c.title}</div>
              <p className="text-sm text-text/80">{c.desc}</p>
              <div className="pt-1 text-xs text-text/60">Tocá para ver imagen</div>
            </Card>
          ))}
        </div>
      </section>

      {/* VIDEO VAULT (como el index) */}
      <section className="space-y-6">
        <h2 className="text-2xl font-extrabold md:text-3xl">Archivos de la Mesa</h2>
        <p className="max-w-3xl text-text/80">
          Ejemplos en video para sacar ideas de ritmo, reglas, narración y creación de personajes.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {VIDEOS.slice(0, 3).map((v) => (
            <Card key={v.youtubeId} className="space-y-3">
              <div className="text-sm font-semibold text-primary">{v.title}</div>
              <div className="text-xs text-text/70">{v.category}{v.notes ? ` • ${v.notes}` : ""}</div>
              <YoutubeFrame id={v.youtubeId} />
              <Button as="link" href="/videos" variant="ghost" className="w-full">Ver más</Button>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ (resumen del index) */}
      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold md:text-3xl">FAQ</h2>

        <div className="space-y-3">
          <details className="rounded-xl border border-border/60 bg-card/40 p-4">
            <summary className="cursor-pointer text-primary">¿Qué es D&D exactamente?</summary>
            <p className="mt-2 text-text/80">
              Es una historia compartida: vos decidís, el dado define, y el mundo reacciona. No hay guion.
            </p>
          </details>

          <details className="rounded-xl border border-border/60 bg-card/40 p-4">
            <summary className="cursor-pointer text-primary">¿Tengo que saber jugar?</summary>
            <p className="mt-2 text-text/80">No. Si sos nuevo/a, te guío paso a paso. Aprendés jugando.</p>
          </details>

          <details className="rounded-xl border border-border/60 bg-card/40 p-4">
            <summary className="cursor-pointer text-primary">¿Presencial o virtual?</summary>
            <p className="mt-2 text-text/80">Se puede cualquiera. Virtual: Discord + mic decente. Presencial: con ganas alcanza.</p>
          </details>

          <details className="rounded-xl border border-border/60 bg-card/40 p-4">
            <summary className="cursor-pointer text-primary">¿Puedo evitar temas sensibles?</summary>
            <p className="mt-2 text-text/80">Sí. En el formulario podés marcar límites (líneas/velos). Se respeta.</p>
          </details>
        </div>
      </section>

      {/* MODALES */}
      <Modal open={!!img} onClose={() => setImg(null)} title={img?.title ?? ""}>
        {img && (
          <div className="space-y-4">
            <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-black/40 pt-[56.25%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.bg} alt={img.title} className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <Button onClick={() => setImg(null)} className="w-full">Cerrar</Button>
          </div>
        )}
      </Modal>

      <Modal open={openPrologue} onClose={() => setOpenPrologue(false)} title="El Llamado">
        <div className="space-y-4 text-text/85">
          <p>
            El mundo se está agrietando. Lo sentís en el aire: esa estática que no desaparece, las sombras que se alargan cuando cae el sol.
          </p>
          <p>
            La Mesa Perdida no es solo un juego. Es un pacto. ¿Tenés el coraje para tirar los dados?
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => { setOpenPrologue(false); setOpenForm(true); }} className="w-full sm:w-auto">Firmar el Pacto</Button>
            <Button onClick={() => setOpenPrologue(false)} variant="ghost" className="w-full sm:w-auto">Cerrar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={openCinema} onClose={() => setOpenCinema(false)} title="Cine de la Mesa">
        <p className="text-text/80">
          Mirá un ejemplo real para captar el ritmo: escenas, decisiones, tiradas y consecuencias.
        </p>
        <YoutubeFrame id={mainVideo} />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button as="link" href={`/videos`} className="w-full sm:w-auto">Ver lista completa</Button>
          <Button onClick={() => setOpenCinema(false)} variant="ghost" className="w-full sm:w-auto">Cerrar</Button>
        </div>
      </Modal>

      <Modal open={openRules} onClose={() => setOpenRules(false)} title="Reglas rápidas">
        <div className="space-y-3 text-text/85">
          <p><b className="text-primary">1)</b> Decís qué querés hacer.</p>
          <p><b className="text-primary">2)</b> El DM describe el mundo y pide una tirada si hace falta.</p>
          <p><b className="text-primary">3)</b> Tirás d20 + modificadores → si superás la DC, sale; si no, hay consecuencia.</p>
          <p><b className="text-primary">4)</b> En combate: turnos, movimiento, acción, bonus (según la clase).</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button as="link" href="/simulador" className="w-full sm:w-auto">Probar simulador</Button>
            <Button as="link" href="/creador" variant="ghost" className="w-full sm:w-auto">Crear PJ</Button>
          </div>
        </div>
      </Modal>

      <Modal open={openForm} onClose={() => setOpenForm(false)} title="Hoja de inscripción">
        <div className="space-y-4">
          <p className="text-text/80">
            Este es el “form” estilo La Mesa Perdida, pero conectado a tu sistema nuevo (DB + admin).
          </p>

          {loadingCampaigns ? (
            <div className="text-text/70">Cargando campañas…</div>
          ) : campaigns.length === 0 ? (
            <div className="space-y-3 text-text/80">
              <div>No pude cargar campañas (o falta DB).</div>
              <Button as="link" href="/campanias" className="w-full">Ir a /campanias</Button>
            </div>
          ) : (
            <>
              <label className="block text-sm font-semibold text-primary">Elegí campaña</label>
              <select
                className="w-full rounded-md border border-border/60 bg-bg px-4 py-3 text-base"
                value={campaignId ?? ""}
                onChange={(e) => setCampaignId(Number(e.target.value))}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.is_open ? "🟢" : "⚫"} {c.title}
                  </option>
                ))}
              </select>

              {campaignId ? (
                <div className="rounded-xl border border-border/60 bg-black/20 p-3">
                  {/* El form real está en /campanias/[slug], acá lo llevamos directo */}
                  <Button
                    as="link"
                    href={`/campanias/${campaigns.find((c) => c.id === campaignId)?.slug ?? ""}`}
                    className="w-full"
                  >
                    Abrir formulario completo
                  </Button>
                  <div className="mt-2 text-xs text-text/60">
                    Tip: también lo podés completar desde “Campañas”. Queda guardado y se ve en Admin.
                  </div>
                </div>
              ) : null}
            </>
          )}

          <Button onClick={() => setOpenForm(false)} variant="ghost" className="w-full">
            Volver a la taberna
          </Button>
        </div>
      </Modal>
    </div>
  );
}
