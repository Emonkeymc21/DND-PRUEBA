import { notFound } from "next/navigation";
import { Card, Button } from "@/components/ui";
import RegistrationForm from "@/components/campaigns/registration-form";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inscripción" };

type Campaign = {
  id: number;
  slug: string;
  title: string;
  description: string;
  is_open: boolean;
};

function normalizeCampaign(row: any): Campaign | null {
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

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Faltan variables de Supabase (URL/ANON_KEY).");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getCampaignBySlug(slug: string): Promise<Campaign | null> {
  try {
    const sb = supabase();

    let q = await sb.from("campaigns").select("id,slug,title,description,is_open").eq("slug", slug).limit(1);
    if (!q.error) return normalizeCampaign(q.data?.[0]);

    const q2 = await sb.from("campanias").select("id,slug,title,description,is_open").eq("slug", slug).limit(1);
    if (!q2.error) return normalizeCampaign(q2.data?.[0]);

    return null;
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
