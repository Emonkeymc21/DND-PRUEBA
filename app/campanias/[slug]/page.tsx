import { notFound } from "next/navigation";
import { Card, Button } from "@/components/ui";
import RegistrationForm from "@/components/campaigns/registration-form";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inscripción" };

type Campaign = {
  id: number;
  slug: string;
  title: string;
  description: string;
  is_open: boolean;
};

function normalize(row: any): Campaign | null {
  if (!row) return null;
  const c: Campaign = {
    id: Number(row?.id),
    slug: String(row?.slug ?? ""),
    title: String(row?.title ?? ""),
    description: String(row?.description ?? ""),
    is_open: Boolean(row?.is_open),
  };
  if (!c.slug || !c.title) return null;
  return c;
}

async function getCampaignBySlug(slug: string): Promise<Campaign | null> {
  try {
    const sql = db();
    const rows = await sql`
      select id, slug, title, description, is_open
      from campaigns
      where slug = ${slug}
      limit 1
    `;
    return normalize(rows?.[0]);
  } catch {
    return null;
  }
}

export default async function CampaignSignupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await getCampaignBySlug(slug);
  if (!campaign) return notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-balance text-4xl font-extrabold md:text-5xl">{campaign.title}</h1>
      <p className="max-w-3xl text-text/80">{campaign.description}</p>

      <Card>
        {!campaign.is_open ? (
          <div className="text-text/80">Esta campaña está cerrada.</div>
        ) : (
          <RegistrationForm campaignId={campaign.id} />
        )}
      </Card>

      <Button as="link" href="/campanias" variant="ghost" className="w-full sm:w-auto">
        ← Volver
      </Button>
    </div>
  );
}
