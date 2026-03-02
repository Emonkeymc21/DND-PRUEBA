import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { CAMPAIGNS, CAMPAIGN_EXAMPLES_NOTICE } from "@/data/campaigns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campañas" };

export default function CampaniasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold">Campañas</h1>
          <p className="max-w-2xl text-text/80">
            Ejemplos listos para jugar: Fantasía, Terror, Sci‑Fi y Anime. Elegí una, mirá la propuesta y anotate.
          </p>
          <p className="mt-2 text-sm text-yellow-200/80">{CAMPAIGN_EXAMPLES_NOTICE}</p>
        </div>

        <Button as="link" href="/videos" className="w-full sm:w-auto">
          Ver videos recomendados
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CAMPAIGNS.map((c) => (
          <Card key={c.slug} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{c.genre}</Badge>
              <span className="text-xs text-text/70">{c.system}</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold">{c.title}</h2>
              <p className="text-sm text-text/80">{c.description}</p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-text/70">
              <span>⏱️ {c.duration}</span>
              <span>🎭 {c.tone}</span>
              <span>👥 {c.seats}</span>
            </div>

            <div className="pt-2">
              <Link
                href={`/campanias/${c.slug}`}
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-black hover:opacity-90"
              >
                Ver y anotarme →
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
