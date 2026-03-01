import { Card, Badge } from "@/components/ui";
import { VIDEOS, PLAYLIST_URL } from "@/data/videos";
import YoutubeEmbed from "@/components/youtube-embed";

export const metadata = { title: "Videos" };

export default function VideosPage() {
  const categories = Array.from(new Set(VIDEOS.map((v) => v.category)));

  return (
    <div className="space-y-8">
      <div>
        <Badge>Curación básica</Badge>
        <h1 className="mt-3 text-4xl font-extrabold">Videos</h1>
        <p className="mt-2 max-w-3xl text-text/80">
          Ejemplos para aprender reglas, mirar partidas reales, sacar ideas de narración y entender cómo fluye una sesión.
        </p>
        {PLAYLIST_URL ? (
          <p className="mt-2 text-sm text-text/70">
            Playlist: <a className="text-primary underline" href={PLAYLIST_URL} target="_blank" rel="noreferrer">abrir</a>
          </p>
        ) : null}
      </div>

      {categories.map((cat) => (
        <section key={cat} className="space-y-3">
          <h2 className="text-xl font-bold text-primary">{cat}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {VIDEOS.filter((v) => v.category === cat).map((v) => (
              <Card key={v.youtubeId} className="space-y-3">
                <div>
                  <div className="font-semibold">{v.title}</div>
                  {v.notes ? <div className="mt-1 text-xs text-text/70">{v.notes}</div> : null}
                </div>
                <YoutubeEmbed youtubeId={v.youtubeId} title={v.title} />
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
