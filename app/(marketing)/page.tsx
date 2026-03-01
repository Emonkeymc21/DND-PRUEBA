import { HomeInteractive } from "@/components/home/home-interactive";
import { Card } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="space-y-14">
      <HomeInteractive />

      <section className="space-y-4">
        <h2 className="text-3xl font-extrabold">¿Qué es D&D?</h2>
        <p className="max-w-3xl text-text/80">
          Dungeons & Dragons es un juego de rol donde un grupo cuenta una historia. Una persona (DM) describe el mundo y los desafíos.
          El resto interpreta personajes. Cuando hay incertidumbre, se tiran dados (d20) y se aplican modificadores.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="font-bold text-primary">Cómo se juega (rápido)</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text/80">
            <li>Decís qué intentás hacer.</li>
            <li>El DM define dificultad (DC).</li>
            <li>Tirás d20 + modificadores.</li>
            <li>Consecuencias… y seguimos la historia.</li>
          </ul>
        </Card>
        <Card>
          <h3 className="font-bold text-primary">¿Por dónde empiezo?</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text/80">
            <li>Probá el simulador (tutorial). </li>
            <li>Armá tu personaje con el creador SRD.</li>
            <li>Anotate a una campaña desde la web.</li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
