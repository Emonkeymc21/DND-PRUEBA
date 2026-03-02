"use client";

import * as React from "react";

const MUSIC_VIDEO_ID = "wNKZkFs-hvE"; // del index original
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

    const existing = document.querySelector("script[data-yt-iframe]") as HTMLScriptElement | null;
    if (existing) {
      const t = window.setInterval(() => {
        if (window.YT?.Player) {
          window.clearInterval(t);
          resolve();
        }
      }, 60);
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.dataset.ytIframe = "1";
    document.head.appendChild(tag);

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };

    const t = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(t);
        resolve();
      }
    }, 100);
  });
}

export function MusicControl() {
  const [ready, setReady] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const playerRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const shouldPlay = window.localStorage.getItem(STORAGE_KEY) === "1";
    setPlaying(shouldPlay);

    let mounted = true;
    (async () => {
      await loadYouTubeIframeAPI();
      if (!mounted) return;

      const host = document.getElementById("yt-music-host");
      if (!host) return;

      if (playerRef.current) {
        setReady(true);
        return;
      }

      playerRef.current = new window.YT.Player("yt-music-host", {
        height: "0",
        width: "0",
        videoId: MUSIC_VIDEO_ID,
        playerVars: { playsinline: 1, controls: 0, loop: 1, rel: 0 },
        events: {
          onReady: () => {
            try {
              playerRef.current.setVolume(70);
            } catch {}
            setReady(true);
            if (shouldPlay) {
              try {
                playerRef.current.playVideo();
              } catch {}
            }
          },
          onStateChange: (event: any) => {
            if (event?.data === window.YT.PlayerState.ENDED) {
              try {
                playerRef.current.playVideo();
              } catch {}
            }
          }
        }
      });
    })();

    return () => {
      mounted = false;
    };
  }, []);

  function toggle() {
    if (!ready || !playerRef.current) return;
    setPlaying((p) => {
      const next = !p;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      try {
        if (next) playerRef.current.playVideo();
        else playerRef.current.pauseVideo();
      } catch {}
      return next;
    });
  }

  return (
    <>
      <div id="yt-music-host" style={{ display: "none" }} />
      <button
        type="button"
        onClick={toggle}
        className="fixed right-4 top-4 z-[120] grid h-12 w-12 place-items-center rounded-full border border-primary/70 bg-black/60 text-xl text-primary shadow-[0_0_20px_rgba(0,0,0,.5)] backdrop-blur hover:bg-black/70 active:scale-95 md:right-8 md:top-8"
        aria-label={playing ? "Silenciar música" : "Activar música"}
        title={playing ? "Música: ON" : "Música: OFF"}
      >
        {playing ? "🔊" : "🔇"}
      </button>
    </>
  );
}
