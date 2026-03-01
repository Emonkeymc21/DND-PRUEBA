"use client";

import * as React from "react";

function YouTubeLite({ id, title }: { id: string; title: string }) {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border/60 bg-black shadow-[0_10px_25px_rgba(0,0,0,0.45)]">
      <div className="aspect-video w-full">
        {!loaded ? (
          <button
            className="flex h-full w-full items-center justify-center bg-black/60 text-primary hover:text-white"
            onClick={() => setLoaded(true)}
            aria-label={`Reproducir: ${title}`}
          >
            ▶ Reproducir
          </button>
        ) : (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
    </div>
  );
}

export function YouTubeEmbed({ id, title }: { id: string; title: string }) {
  return <YouTubeLite id={id} title={title} />;
}
