"use client";

import * as React from "react";

/**
 * Música ambiente.
 *
 * Antes cargaba la API de iframes de YouTube (~100kb + varias conexiones) en
 * TODAS las páginas, apenas entrabas, aunque nunca tocaras el botón. Ahora el
 * script recién se descarga cuando la persona hace click. La home carga bastante
 * más liviana y no se pelea con el autoplay del navegador.
 *
 * La pista está en data/videos.ts (MUSIC_VIDEO_ID) para que sea fácil cambiarla.
 */

import { MUSIC_VIDEO_ID } from "@/data/videos";

const STORAGE_KEY = "mesa_music_playing";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeIframeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();
    if (window.YT?.Player) return resolve();

    const poll = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(poll);
        resolve();
      }
    }, 80);

    if (!document.querySelector("script[data-yt-iframe]")) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.dataset.ytIframe = "1";
      document.head.appendChild(tag);

      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        window.clearInterval(poll);
        resolve();
      };
    }

    // Si YouTube está bloqueado, no dejamos la promesa colgada para siempre.
    window.setTimeout(() => {
      window.clearInterval(poll);
      resolve();
    }, 8000);
  });
}

export function MusicControl() {
  const [playing, setPlaying] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const playerRef = React.useRef<any>(null);

  async function ensurePlayer(): Promise<boolean> {
    if (playerRef.current) return true;

    setLoading(true);
    await loadYouTubeIframeAPI();

    if (!window.YT?.Player) {
      setLoading(false);
      return false;
    }

    await new Promise<void>((resolve) => {
      playerRef.current = new window.YT.Player("yt-music-host", {
        height: "0",
        width: "0",
        videoId: MUSIC_VIDEO_ID,
        playerVars: { playsinline: 1, controls: 0, loop: 1, rel: 0 },
        events: {
          onReady: () => {
            try {
              playerRef.current.setVolume(55);
            } catch {}
            resolve();
          },
          onStateChange: (event: any) => {
            if (event?.data === window.YT?.PlayerState?.ENDED) {
              try {
                playerRef.current.playVideo();
              } catch {}
            }
          },
          onError: () => resolve(),
        },
      });
    });

    setLoading(false);
    return true;
  }

  async function toggle() {
    if (playing) {
      try {
        playerRef.current?.pauseVideo();
      } catch {}
      setPlaying(false);
      try {
        window.localStorage.setItem(STORAGE_KEY, "0");
      } catch {}
      return;
    }

    const ok = await ensurePlayer();
    if (!ok) return;

    try {
      playerRef.current.playVideo();
      setPlaying(true);
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }

  return (
    <>
      <div id="yt-music-host" style={{ display: "none" }} />
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className="fixed right-3 top-20 z-[60] grid h-11 w-11 place-items-center rounded-full border border-border/70 bg-black/60 text-lg text-primary backdrop-blur transition hover:border-primary/70 active:scale-95 disabled:opacity-50 md:right-6 md:top-24"
        aria-label={playing ? "Silenciar música ambiente" : "Activar música ambiente"}
        title={playing ? "Música: ON" : "Música: OFF"}
      >
        {loading ? "…" : playing ? "🔊" : "🔇"}
      </button>
    </>
  );
}
