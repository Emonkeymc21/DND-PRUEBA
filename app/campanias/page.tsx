import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { CAMPAIGNS, CAMPAIGN_EXAMPLES_NOTICE } from "@/data/campaigns";

export const metadata = { title: "Campañas" };

export default function CampaniasPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card/50 p-5">
        <Badge>📜 Campañas</Badge>
        <h1 className="mt-3 text-2xl font-extrabold text-primary">Elegí una propuesta</h1>
        <p className="mt-1 max-w-2xl text-text/80">
          Mirá ejemplos listos para jugar (y adaptables a cualquier mesa).
        </p>
        <p className="mt-2 text-sm text-yellow-200/80">{CAMPAIGN_EXAMPLES_NOTICE}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CAMPAIGNS.map((c) => (
          <Card key={c.slug} className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-primary">{c.title}</div>
                <div className="text-sm text-text/80">{c.description}</div>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  c.is_open ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"
                }`}
              >
                {c.is_open ? "Abierta" : "Cerrada"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-text/70">
              <span className="rounded-full border border-border/60 bg-black/20 px-3 py-1">Estilo: {c.style}</span>
              <span className="rounded-full border border-border/60 bg-black/20 px-3 py-1">Nivel: {c.levelRange}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button as="link" href={`/campanias/${c.slug}`}>Ver detalles</Button>
              <Button as="link" href="/videos" variant="ghost">Ver videos</Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="font-bold text-primary">¿No sabés cuál elegir?</div>
        <p className="mt-1 text-sm text-text/80">
          Probá el simulador: te muestra combate, tiradas y decisiones como en una mesa real.
        </p>
        <div className="mt-3">
          <Button as="link" href="/simulador">Probar simulador</Button>
        </div>
      </Card>
    </div>
  );
}
