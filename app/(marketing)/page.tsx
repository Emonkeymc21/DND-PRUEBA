import Image from "next/image";
import { Badge, Button, Card, Container } from "@/components/ui";

const heroImg = "https://images.unsplash.com/photo-1529973565457-a29ae2389bb6?auto=format&fit=crop&w=1600&q=80";

export default function HomePage() {
  return (
    <div className="space-y-14">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur">
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <Image src={heroImg} alt="" fill className="object-cover" priority />
        </div>
        <div className="relative">
          <Badge>🎲 D&D en español • gratis-friendly</Badge>
          <h1 className="mt-4 text-balance text-4xl font-extrabold tracking-tight md:text-6xl">
            Aprendé D&D, mirá partidas, y probá una aventura narrada.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-text/80">
            Un proyecto “premium” y funcional con guías, videos curados, simulador con narrador por voz (SpeechSynthesis),
            creador rápido SRD y formulario para anotarte a campañas con DB Postgres.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button as="link" href="/simulador">Probar simulador</Button>
            <Button as="link" href="/creador" variant="ghost">Crear personaje</Button>
            <Button as="link" href="/campanias" variant="ghost">Anotarme a campaña</Button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card>
              <h2 className="text-lg font-bold text-primary">Sección educativa</h2>
              <p className="mt-2 text-sm text-text/75">Qué es D&D, cómo se juega, conceptos clave y glosario.</p>
            </Card>
            <Card>
              <h2 className="text-lg font-bold text-primary">Videos embebidos</h2>
              <p className="mt-2 text-sm text-text/75">Curación simple con categorías, lazy-load y lista editable.</p>
            </Card>
            <Card>
              <h2 className="text-lg font-bold text-primary">Herramientas</h2>
              <p className="mt-2 text-sm text-text/75">Simulador, creador SRD y campañas con admin.</p>
            </Card>
          </div>
        </div>
      </section>

      <Container className="space-y-10">
        <section id="que-es">
          <h2 className="text-3xl font-extrabold">¿Qué es D&D?</h2>
          <p className="mt-3 max-w-3xl text-text/80">
            Dungeons & Dragons es un juego de rol donde un grupo cuenta una historia. Una persona (DM) describe el mundo
            y los desafíos. El resto interpreta personajes. Cuando hay incertidumbre, se tiran dados (d20) y se aplican
            modificadores. Acá podés aprender lo básico y probar una mini-aventura sin instalar nada.
          </p>
        </section>

        <section id="como">
          <h2 className="text-3xl font-extrabold">Cómo se juega (rápido)</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card>
              <h3 className="font-bold text-primary">1) Decís qué intentás</h3>
              <p className="mt-2 text-sm text-text/80">
                “Quiero investigar el altar”, “quiero trepar”, “quiero convencer al guardia”.
              </p>
            </Card>
            <Card>
              <h3 className="font-bold text-primary">2) El DM define dificultad</h3>
              <p className="mt-2 text-sm text-text/80">
                Si hace falta, tirás d20 + atributo + competencia. Si superás la DC, sucede.
              </p>
            </Card>
            <Card>
              <h3 className="font-bold text-primary">3) Consecuencias y combate</h3>
              <p className="mt-2 text-sm text-text/80">
                En combate se juega por turnos, con acciones simples. Esta web trae un combate mini para entenderlo.
              </p>
            </Card>
            <Card>
              <h3 className="font-bold text-primary">4) Lo importante: la mesa</h3>
              <p className="mt-2 text-sm text-text/80">
                La historia la construyen juntos. El “ganar” es que la aventura sea memorable.
              </p>
            </Card>
          </div>
        </section>

        <section id="faq" className="space-y-3">
          <h2 className="text-3xl font-extrabold">FAQ</h2>
          <details className="rounded-xl border border-border/70 bg-card/60 p-4">
            <summary className="cursor-pointer font-semibold text-primary">¿Necesito saber reglas?</summary>
            <p className="mt-2 text-sm text-text/80">No. El simulador está pensado como tutorial. Y el creador te guía.</p>
          </details>
          <details className="rounded-xl border border-border/70 bg-card/60 p-4">
            <summary className="cursor-pointer font-semibold text-primary">¿Esto es oficial?</summary>
            <p className="mt-2 text-sm text-text/80">No. Usa SRD y APIs comunitarias. Es un proyecto educativo.</p>
          </details>
        </section>
      </Container>
    </div>
  );
}
