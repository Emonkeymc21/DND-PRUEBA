import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { CAMPAIGN_EXAMPLES } from "@/data/campaigns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Detalle de campaña" };

export default function CampaignDetail({ params }: { params: { slug: string } }) {
  const c = CAMPAIGN_EXAMPLES.find((x) => x.slug === params.slug);
  if (!c) return notFound();

  return (
    <div className="space-y-8">
      <div>
        <Badge>{c.is_open ? "🟢 Abierta" : "⚫ Cerrada"}</Badge>
        <h1 className="mt-3 text-balance text-4xl font-extrabold md:text-5xl">{c.title}</h1>
        <p className="mt-2 max-w-3xl text-text/80">{c.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2">
          <div className="text-sm font-semibold text-primary">Géneros</div>
          <div className="flex flex-wrap gap-2">
            {c.genre.map((g) => (
              <span key={g} className="rounded-full border border-border/60 bg-black/30 px-2 py-1 text-xs text-text/75">
                {g}
              </span>
            ))}
          </div>
        </Card>

        <Card className="space-y-2">
          <div className="text-sm font-semibold text-primary">Datos rápidos</div>
          <div className="text-sm text-text/80">Nivel: {c.level}</div>
          <div className="text-sm text-text/80">Duración: {c.duration}</div>
          <div className="text-sm text-text/80">Sistema: {c.system}</div>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="text-sm font-semibold text-primary">Highlights</div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-text/80">
          {c.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button as="link" href="/campanias#anotarme" className="w-full sm:w-auto">
            Anotarme (form)
          </Button>
          <Button as="link" href="/campanias" variant="ghost" className="w-full sm:w-auto">
            Volver
          </Button>
        </div>
      </Card>

      <div className="text-sm text-text/70">
        Tip: si querés volver a DB+admin más adelante, se puede reactivar (pero por ahora lo dejamos 100% gratis y estable para Netlify).
      </div>
    </div>
  );
}
