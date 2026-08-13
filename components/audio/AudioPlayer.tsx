"use client";

import * as React from "react";
import { Howl } from "howler";

/**
 * Reproductor de música ambiente con Howler.js.
 *
 * Reemplaza el generador de osciladores sintéticos por pistas de audio reales.
 * Howler maneja el desbloqueo de audio en móvil, el crossfade y el manejo de
 * errores de carga mejor que escribir todo eso a mano sobre HTMLAudioElement.
 *
 * SOBRE LOS ARCHIVOS: no incluyo URLs de CDN externas porque no puedo
 * verificar desde acá que existan, tengan la licencia correcta, o sigan
 * arriba el día que alguien clone este repo — un link roto sería peor que no
 * poner nada. En su lugar, esto carga desde /public/audio/<tema>.mp3 y, si el
 * archivo no está, el botón queda visible pero deshabilitado con un aviso
 * (nunca un error feo ni un silencio inexplicable).
 *
 * Dónde conseguir pistas reales, gratis y con licencia clara para uso
 * comercial/proyectos propios (no son afiliados, son puntos de partida
 * conocidos):
 *   - https://pixabay.com/music/ (licencia Pixabay, sin atribución requerida)
 *   - https://freesound.org/ (revisar la licencia de cada pista, varía)
 *   - https://itch.io/game-assets/free/tag-music (muchos packs CC0)
 * Bajá el mp3, ponelo en /public/audio/ con el nombre que corresponda abajo,
 * y el reproductor lo levanta solo.
 */

export type AudioTheme = "fantasy" | "magic" | "anime" | "scifi" | "horror" | "none";

/** Un archivo por temática. Cambiá los nombres si tus mp3 se llaman distinto. */
const TRACKS: Record<AudioTheme, string> = {
  fantasy: "/audio/fantasy-ambient.mp3",
  magic: "/audio/magic-ambient.mp3",
  anime: "/audio/anime-ambient.mp3",
  scifi: "/audio/scifi-ambient.mp3",
  horror: "/audio/horror-ambient.mp3",
  none: "/audio/fantasy-ambient.mp3",
};

const FADE_MS = 1200;

type LoadState = "idle" | "loading" | "ready" | "missing" | "error";

/** Verifica con un HEAD si el archivo existe antes de intentar reproducirlo con Howler. */
async function fileExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

export function useAmbientPlayer(theme: AudioTheme) {
  const [playing, setPlaying] = React.useState(false);
  const [volume, setVolume] = React.useState(0.5);
  const [state, setState] = React.useState<LoadState>("idle");

  const howlRef = React.useRef<Howl | null>(null);
  const currentTheme = React.useRef<AudioTheme | null>(null);

  const stop = React.useCallback(() => {
    const howl = howlRef.current;
    if (!howl) return;
    howl.fade(howl.volume(), 0, FADE_MS);
    window.setTimeout(() => {
      howl.stop();
      howl.unload();
    }, FADE_MS + 50);
    howlRef.current = null;
    currentTheme.current = null;
    setPlaying(false);
  }, []);

  const play = React.useCallback(
    async (t: AudioTheme) => {
      // Mismo tema ya sonando: no hacemos nada, evita un doble fade feo.
      if (currentTheme.current === t && howlRef.current) return;

      if (howlRef.current) stop();

      setState("loading");
      const src = TRACKS[t];

      const exists = await fileExists(src);
      if (!exists) {
        setState("missing");
        return;
      }

      const howl = new Howl({
        src: [src],
        loop: true,
        volume: 0,
        html5: true, // streaming: no espera a bajar el archivo entero
        onloaderror: () => setState("error"),
        onplayerror: () => {
          // Política de autoplay: reintenta desbloqueado por el próximo gesto.
          howl.once("unlock", () => howl.play());
        },
      });

      howlRef.current = howl;
      currentTheme.current = t;

      howl.play();
      howl.fade(0, volume, FADE_MS);
      setState("ready");
      setPlaying(true);
    },
    [stop, volume],
  );

  const toggle = React.useCallback(() => {
    if (playing) {
      stop();
    } else {
      void play(theme);
    }
  }, [playing, stop, play, theme]);

  // Si cambia la temática mientras suena, cruza a la pista nueva.
  React.useEffect(() => {
    if (playing) void play(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  React.useEffect(() => {
    howlRef.current?.volume(volume);
  }, [volume]);

  React.useEffect(() => {
    return () => {
      howlRef.current?.stop();
      howlRef.current?.unload();
    };
  }, []);

  return { playing, toggle, volume, setVolume, state };
}

export function AudioPlayer({ theme }: { theme: AudioTheme }) {
  const { playing, toggle, volume, setVolume, state } = useAmbientPlayer(theme);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface/60 px-3 py-2">
      <button
        type="button"
        onClick={toggle}
        disabled={state === "loading"}
        aria-label={playing ? "Pausar música ambiente" : "Reproducir música ambiente"}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/70 text-base text-primary transition hover:border-primary/70 disabled:opacity-50"
        title={
          state === "missing"
            ? "Falta el archivo de audio: ver components/audio/AudioPlayer.tsx"
            : undefined
        }
      >
        {state === "loading" ? "…" : playing ? "🔊" : "🔇"}
      </button>

      {playing ? (
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-24 accent-[rgb(var(--primary))]"
          aria-label="Volumen de la música"
        />
      ) : (
        <span className="text-xs text-muted">Música ambiente</span>
      )}

      {state === "missing" ? (
        <span className="text-[10px] text-ember" title="Poné un mp3 en /public/audio/">
          sin pista
        </span>
      ) : null}
    </div>
  );
}

export default AudioPlayer;
