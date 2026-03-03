import { VIDEOS } from "@/data/videos";
import { Badge, Card } from "@/components/ui";
import { YouTubeEmbed } from "@/components/youtube-embed";

export const metadata = {
  title: "Videos"
};

export default function VideosPage() {
  const categories = Array.from(new Set(VIDEOS.map(v => v.category)));

  return (
    <div className="space-y-10">
      <div>
        <Badge>Videoteca</Badge>
        <h1 className="mt-3 text-4xl font-extrabold">Videos</h1>
        <p className="mt-2 max-w-3xl text-text/80">
          Una selección para entrar en clima. Elegí una categoría y mirá la lista completa.
        </p>
      </div>

      {categories.map((cat) => (
        <section key={cat} className="space-y-4">
          <h2 className="text-2xl font-bold text-primary">{cat}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {VIDEOS.filter(v => v.category === cat).map((v) => (
              <Card key={v.youtubeId} className="space-y-3">
                <div className="text-sm font-semibold">{v.title}</div>
                <YouTubeEmbed id={v.youtubeId} title={v.title} />
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
