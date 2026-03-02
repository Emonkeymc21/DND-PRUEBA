import { Badge, Button, Card } from "@/components/ui";
import { CAMPAIGNS, CAMPAIGN_EXAMPLES_NOTICE } from "@/data/campaigns";
import { RpgSignupForm } from "@/components/forms/rpg-signup-form";

type CampaignSlugPageProps = { params: Promise<{ slug: string }> };

export const metadata = { title: "Campaña" };

export default function CampaignDetail({ params }: Props) {
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
    <div className="space-y-6">
      <Card className="p-6 space-y-3">
        <Badge>🧭 Campaña</Badge>
        <h1 className="text-2xl font-extrabold text-primary">{campaign.title}</h1>
        <p className="text-text/80">{campaign.description}</p>
        <p className="text-sm text-yellow-200/80">{CAMPAIGN_EXAMPLES_NOTICE}</p>

        <div className="flex flex-wrap gap-2 text-xs text-text/70">
          <span className="rounded-full border border-border/60 bg-black/20 px-3 py-1">Estilo: {campaign.style}</span>
          <span className="rounded-full border border-border/60 bg-black/20 px-3 py-1">Nivel: {campaign.levelRange}</span>
          <span
            className={`rounded-full border border-border/60 px-3 py-1 ${
              campaign.is_open ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"
            }`}
          >
            {campaign.is_open ? "Abierta" : "Cerrada"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button as="link" href="/videos">Ver videos</Button>
          <Button as="link" href="/simulador" variant="ghost">Probar simulador</Button>
          <Button as="link" href="/campanias" variant="ghost">Volver</Button>
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-extrabold text-primary">Anotarme a esta campaña</h2>
        <p className="text-sm text-text/80">
          Formulario propio del sitio (envía a Google Forms). 100% gratis y sin DB.
        </p>
        <RpgSignupForm compact />
      </Card>
    </div>
  );
}