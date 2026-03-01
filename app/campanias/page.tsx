import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campañas" };

type Campaign = {
  id: number;
  slug: string;
  title: string;
  description: string;
  is_open: boolean;
};

function normalizeCampaigns(rows: unknown): Campaign[] {
  const arr = Array.isArray(rows) ? rows : [];
  return arr.map((r: any) => ({
    id: Number(r?.id),
    slug: String(r?.slug ?? ""),
    title: String(r?.title ?? ""),
    description: String(r?.description ?? ""),
    is_open: Boolean(r?.is_open),
  })).filter(c => !!c.slug && !!c.title);
}

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Faltan variables de Supabase (URL/ANON_KEY).");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getCampaigns(): Promise<Campaign[]> {
  try {
    const sb = supabase();

    // Intento 1: tabla "campaigns"
    let q = await sb.from("campaigns").select("id,slug,title,description,is_open").order("id", { ascending: false });
    if (!q.error) return normalizeCampaigns(q.data);

    // Intento 2: tabla "campanias" (por si tu DB está en español)
    const q2 = await sb.from("campanias").select("id,slug,title,description,is_open").order("id", { ascending: false });
    if (!q2.error) return normalizeCampaigns(q2.data);

    return [];
  } catch {
    return [];
  }
}

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="space-y-8">
      <div>
        <Badge>🧾 Form + DB + Admin</Badge>
        <h1 className="mt-3 text-4xl font-extrabold">Campañas</h1>
        <p className="mt-2 max-w-3xl text-text/80">
          Listado de campañas desde Supabase. Si no ves campañas, revisá variables y tabla.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {campaigns.length === 0 ? (
          <Card>
            <div className="text-text/80">
              No hay campañas cargadas (o falta configuración). Revisá:
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text/75">
                <li><code className="rounded bg-black/40 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code></li>
                <li><code className="rounded bg-black/40 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
                <li>Tabla <code className="rounded bg-black/40 px-1 py-0.5">campaigns</code> o <code className="rounded bg-black/40 px-1 py-0.5">campanias</code></li>
              </ul>
            </div>
          </Card>
        ) : (
          campaigns.map((c) => (
            <Card key={c.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold text-primary">{c.title}</div>
                <span className={`rounded-full border px-3 py-1 text-xs ${c.is_open ? "border-primary/60 text-primary" : "border-border/60 text-text/70"}`}>
                  {c.is_open ? "Abierta" : "Cerrada"}
                </span>
              </div>
              <p className="text-sm text-text/80">{c.description}</p>
              <div className="flex gap-2">
                <Button as="link" href={`/campanias/${c.slug}`} variant="primary">Anotarme</Button>
                <Link className="text-sm text-text/80 hover:text-primary" href="/admin">Admin</Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
