import { notFound } from "next/navigation";
import { Card, Button } from "@/components/ui";
import RegistrationForm from "@/components/campaigns/registration-form";

export const metadata = { title: "Inscripción" };

async function getCampaign(slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/campaigns/${slug}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json() as Promise<{ id: number; slug: string; title: string; description: string; is_open: boolean }>;
}

export default async function CampaignSignupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await getCampaign(slug);
  if (!campaign) return notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-extrabold">{campaign.title}</h1>
      <p className="max-w-3xl text-text/80">{campaign.description}</p>

      <Card>
        {!campaign.is_open ? (
          <div className="text-text/80">Esta campaña está cerrada.</div>
        ) : (
          <RegistrationForm campaignId={campaign.id} />
        )}
      </Card>

      <Button as="link" href="/campanias" variant="ghost">← Volver</Button>
    </div>
  );
}
