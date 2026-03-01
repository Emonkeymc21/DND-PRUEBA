import { Card, Button, Badge } from "@/components/ui";
import Link from "next/link";

export const metadata = { title: "Campañas" };

async function getCampaigns() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/campaigns`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json() as Promise<Array<{ id: number; slug: string; title: string; description: string; is_open: boolean }>>;
}

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="space-y-8">
      <div>
        <Badge>🧾 Form + DB + Admin</Badge>
        <h1 className="mt-3 text-4xl font-extrabold">Campañas</h1>
        <p className="mt-2 max-w-3xl text-text/80">
          Acá se listan campañas (seed + admin). Podés anotarte con un formulario que guarda en Postgres.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {campaigns.length === 0 ? (
          <Card>
            <div className="text-text/80">No hay campañas cargadas aún. Configurá DB y corré <code className="rounded bg-black/40 px-1 py-0.5">npm run db:seed</code>.</div>
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
