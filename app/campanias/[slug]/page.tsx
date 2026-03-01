import { notFound } from "next/navigation";
import { Card, Button } from "@/components/ui";
import RegistrationForm from "@/components/campaigns/registration-form";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inscripción" };

async function getCampaign(slug: string) {
  try {
    const sql = db();
    const rows = await sql`
      select id, slug, title, description, is_open
      from campaigns
      where slug = ${slug}
      limit 1
    `;
    return rows[0] as { id: number; slug: string; title: string; description: string; is_open: boolean } | undefined;
  } catch {
    return undefined;
  }
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
