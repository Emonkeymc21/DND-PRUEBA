import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { CAMPAIGN_EXAMPLES } from "@/data/campaigns";
import { RpgSignupForm } from "@/components/forms/rpg-signup-form";

export const metadata = { title: "Campañas" };

export default function CampaignsPage() {
  return (
    <div className="space-y-10">
      <div>
        <Badge>🎭 Ejemplos (sin DB)</Badge>
        <h1 className="mt-3 text-balance text-4xl font-extrabold md:text-5xl">Campañas</h1>
        <p className="mt-2 max-w-3xl text-text/80">
          Campañas ejemplo (Fantasía, Terror, Sci‑Fi, Anime, etc.). Editalas en{" "}
          <code className="rounded bg-black/40 px-1 py-0.5">data/campaigns.ts</code>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CAMPAIGN_EXAMPLES.map((c) => (
          <Card key={c.slug} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-lg font-extrabold">{c.title}</div>
              <span className="text-xs text-text/60">{c.level}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {c.genre.map((g) => (
                <span key={g} className="rounded-full border border-border/60 bg-black/30 px-2 py-1 text-xs text-text/75">
                  {g}
                </span>
              ))}
            </div>

            <p className="text-sm text-text/80">{c.description}</p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button as="link" href={`/campanias/${c.slug}`} className="w-full sm:w-auto">
                Ver detalles
              </Button>
              <Button as="link" href="#anotarme" variant="ghost" className="w-full sm:w-auto">
                Anotarme
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <section id="anotarme" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl font-extrabold">Hoja de inscripción</h2>
        <p className="max-w-3xl text-text/80">Form del index original (Google Forms). Sin DB, sin keys, Netlify‑friendly.</p>
        <Card>
          <RpgSignupForm />
        </Card>
        <div className="text-sm text-text/70">
          ¿Preferís probar antes? <Link className="text-primary underline" href="/simulador">Simulador</Link> •{" "}
          <Link className="text-primary underline" href="/videos">Videos</Link>
        </div>
      </section>
    </div>
  );
}
