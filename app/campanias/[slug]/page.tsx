import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { CAMPAIGNS, CAMPAIGN_FORM_EMBED_URL } from "@/data/campaigns";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inscripción" };

export default async function CampaniaSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = CAMPAIGNS.find((c) => c.slug === slug);
  if (!campaign) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{campaign.genre}</Badge>
        <span className="text-xs text-text/70">{campaign.system}</span>
      </div>

      <h1 className="text-balance text-4xl font-extrabold md:text-5xl">{campaign.title}</h1>
      <p className="max-w-3xl text-text/80">{campaign.description}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2">
          <div className="text-sm font-semibold text-text/90">Formato</div>
          <ul className="space-y-1 text-sm text-text/80">
            <li><b>Duración:</b> {campaign.duration}</li>
            <li><b>Dificultad:</b> {campaign.difficulty}</li>
            <li><b>Plazas:</b> {campaign.seats}</li>
            <li><b>Tono:</b> {campaign.tone}</li>
          </ul>
        </Card>

        <Card className="space-y-2">
          <div className="text-sm font-semibold text-text/90">Ganchos</div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-text/80">
            {campaign.hooks.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="text-lg font-bold text-primary">Hoja de inscripción</div>
        <p className="text-sm text-text/80">
          No usamos DB. La inscripción se hace por formulario (como en el Home original).
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button as="link" href={campaign.formEmbedUrl.replace("embedded=true", "")} className="w-full sm:w-auto">
            Abrir formulario en pestaña
          </Button>
          <Link className="text-sm text-text/80 hover:text-primary" href="/videos">
            Ver videos sugeridos →
          </Link>
        </div>

        <div className="mt-2 overflow-hidden rounded-xl border border-border/60">
          <iframe
            title="Formulario de inscripción"
            src={campaign.formEmbedUrl || CAMPAIGN_FORM_EMBED_URL}
            className="h-[78vh] w-full"
            loading="lazy"
          />
        </div>
      </Card>

      <Button as="link" href="/campanias" variant="ghost" className="w-full sm:w-auto">
        ← Volver a Campañas
      </Button>
    </div>
  );
}
