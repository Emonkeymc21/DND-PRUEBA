import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campañas" };

type Campaign = {
  id: number;
  slug: string;
  title: string;
  description: string;
  is_open: boolean;
};

function normalize(rows: unknown): Campaign[] {
  const arr = Array.isArray(rows) ? rows : [];
  return arr
    .map((r: any) => ({
      id: Number(r?.id),
      slug: String(r?.slug ?? ""),
      title: String(r?.title ?? ""),
      description: String(r?.description ?? ""),
      is_open: Boolean(r?.is_open),
    }))
    .filter((c) => !!c.slug && !!c.title);
}

async function getCampaigns(): Promise<Campaign[]> {
  try {
    const sql = db();
    const rows = await sql`
      select id, slug, title, description, is_open
      from campaigns
      order by created_at desc
    `;
    return normalize(rows);
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
        <h1 className="mt-3 text-balance text-4xl font-extrabold md:text-5xl">Campañas</h1>
        <p className="mt-2 max-w-3xl text-text/80">
          Listado desde Postgres (Neon o Supabase Postgres). En móvil, tocá “Anotarme” y completá el form.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {campaigns.length === 0 ? (
          <Card>
            <div className="text-text/80">
              No hay campañas cargadas (o falta DB). Revisá <b>DATABASE_URL</b> y ejecutá:
              {" "}
              <code className="rounded bg-black/40 px-1 py-0.5">npm run db:seed</code>
            </div>
          </Card>
        ) : (
          campaigns.map((c) => (
            <Card key={c.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-lg font-bold text-primary">{c.title}</div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${
                    c.is_open ? "border-primary/60 text-primary" : "border-border/60 text-text/70"
                  }`}
                >
                  {c.is_open ? "Abierta" : "Cerrada"}
                </span>
              </div>

              <p className="text-sm text-text/80">{c.description}</p>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button as="link" href={`/campanias/${c.slug}`} className="w-full sm:w-auto">
                  Anotarme
                </Button>
                <Link className="text-sm text-text/80 hover:text-primary" href="/admin">
                  Admin
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
