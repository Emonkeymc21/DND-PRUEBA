import { Badge, Button, Card, Container } from "@/components/ui";
import { CAMPAIGNS, CAMPAIGN_EXAMPLES_NOTICE } from "@/data/campaigns";
import { RpgSignupForm } from "@/components/forms/rpg-signup-form";

export const metadata = { title: "Campaña" };


export default async function CampaignDetail({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const campaign = CAMPAIGNS.find((c) => c.slug === slug);

  if (!campaign) {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <h1 className="text-xl font-extrabold text-primary">No encontrada</h1>
          <p className="mt-2 text-sm text-text/80">Esa campaña no existe (todavía).</p>
          <div className="mt-4">
            <Button as="link" href="/campanias">Volver a campañas</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <Container className="py-6">
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Detalle */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>🧭 Campaña</Badge>
              <span
                className={`rounded-full border border-border/60 px-3 py-1 text-xs ${
                  campaign.is_open ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200"
                }`}
              >
                {campaign.is_open ? "Inscripciones abiertas" : "Inscripciones cerradas"}
              </span>
            </div>

            <h1 className="text-3xl font-extrabold leading-tight text-primary sm:text-4xl">{campaign.title}</h1>
            <p className="text-base text-text/80">{campaign.description}</p>

            <div className="flex flex-wrap gap-2 text-xs text-text/70">
              <span className="rounded-full border border-border/60 bg-black/20 px-3 py-1">Estilo: {campaign.style}</span>
              <span className="rounded-full border border-border/60 bg-black/20 px-3 py-1">Nivel: {campaign.levelRange}</span>
            </div>

            <div className="rounded-2xl border border-border/60 bg-black/20 p-4">
              <p className="text-sm text-text/80">
                {CAMPAIGN_EXAMPLES_NOTICE}
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  as="link"
                  href="#inscripcion"
                  className="w-full sm:w-auto relative overflow-hidden rounded-2xl px-5 py-3 text-base font-extrabold tracking-wide shadow-lg shadow-black/40 ring-1 ring-white/10 hover:scale-[1.01] active:scale-[0.99] transition"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-amber-500/90 via-fuchsia-500/80 to-cyan-500/80 opacity-90" />
                  <span className="relative">⚔️ Anotarme ahora</span>
                </Button>

                <Button as="link" href="/videos" variant="ghost" className="w-full sm:w-auto">
                  Ver videoteca
                </Button>
                <Button as="link" href="/simulador" variant="ghost" className="w-full sm:w-auto">
                  Probar simulador
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-extrabold text-primary">¿Qué vas a vivir?</h2>
            <ul className="mt-3 space-y-2 text-sm text-text/80">
              <li>• Decisiones reales, consecuencias y momentos memorables.</li>
              <li>• Tiradas visibles y ritmo ágil para entrar en clima rápido.</li>
              <li>• Cuidado de la mesa: límites claros y buen ambiente.</li>
            </ul>
          </Card>
        </div>

        {/* Inscripción */}
        <div className="lg:col-span-5">
          <Card id="inscripcion" className="p-6 space-y-3 lg:sticky lg:top-24">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-primary">Inscripción</h2>
              <Badge>🎲 Cupos limitados</Badge>
            </div>
            <p className="text-sm text-text/80">
              Completá el cuestionario y te contactamos para coordinar.
            </p>
            <RpgSignupForm compact />
          </Card>
        </div>
      </div>
    </Container>
  );
}