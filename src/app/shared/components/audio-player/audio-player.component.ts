import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Howl } from "howler";

/**
 * Reproductor de música ambiente con Howler.js.
 *
 * Puerto de components/audio/AudioPlayer.tsx (Next.js). Nada de osciladores
 * sintéticos generando la música de fondo — eso fue justo lo que se
 * diagnosticó como ruido en la v7. Acá se cargan pistas reales desde
 * /public/audio/. Si el archivo no está, el botón sigue ahí pero no rompe
 * nada ni muestra un aviso de error: sólo no suena hasta que pongas el mp3.
 *
 * Los archivos no vienen incluidos (ver public/audio/README.md para dónde
 * conseguirlos gratis) — no invento una URL de CDN que no puedo verificar
 * que exista o tenga la licencia correcta.
 */

export type AudioTheme = "fantasy" | "magic" | "anime" | "scifi" | "horror" | "none";

const TRACKS: Record<AudioTheme, string> = {
  fantasy: "audio/fantasy-ambient.mp3",
  magic: "audio/magic-ambient.mp3",
  anime: "audio/anime-ambient.mp3",
  scifi: "audio/scifi-ambient.mp3",
  horror: "audio/horror-ambient.mp3",
  none: "audio/fantasy-ambient.mp3",
};

const FADE_MS = 1200;

type LoadState = "idle" | "loading" | "ready" | "missing" | "error";

async function fileExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

@Component({
  selector: "app-audio-player",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-3 rounded-xl border border-border/60 bg-surface/60 px-3 py-2">
      <button
        type="button"
        (click)="toggle()"
        [disabled]="state === 'loading'"
        [attr.aria-label]="playing ? 'Pausar música ambiente' : 'Reproducir música ambiente'"
        class="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border/70 text-base text-primary transition hover:border-primary/70 disabled:opacity-50"
      >
        {{ state === "loading" ? "…" : playing ? "🔊" : "🔇" }}
      </button>

      @if (playing) {
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          [value]="volume"
          (input)="setVolume(+$any($event.target).value)"
          class="w-24 accent-primary"
        />
      } @else {
        <span class="text-xs text-muted">Música ambiente</span>
      }
    </div>
  `,
})
export class AudioPlayerComponent implements OnChanges, OnDestroy {
  @Input() theme: AudioTheme = "none";

  playing = false;
  volume = 0.5;
  state: LoadState = "idle";

  private howl: Howl | null = null;
  private currentTheme: AudioTheme | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    // Si cambia la temática mientras suena, cruza a la pista nueva.
    if (changes["theme"] && this.playing) {
      void this.play(this.theme);
    }
  }

  toggle(): void {
    if (this.playing) {
      this.stop();
    } else {
      void this.play(this.theme);
    }
  }

  setVolume(v: number): void {
    this.volume = v;
    this.howl?.volume(v);
  }

  private async play(theme: AudioTheme): Promise<void> {
    if (this.currentTheme === theme && this.howl) return;
    if (this.howl) this.stop();

    this.state = "loading";
    const src = TRACKS[theme];

    const exists = await fileExists(src);
    if (!exists) {
      this.state = "missing"; // sin badge visible: el botón simplemente no suena
      return;
    }

    const howl = new Howl({
      src: [src],
      loop: true,
      volume: 0,
      html5: true,
      onloaderror: () => {
        this.state = "error";
      },
      onplayerror: () => {
        howl.once("unlock", () => howl.play());
      },
    });

    this.howl = howl;
    this.currentTheme = theme;

    howl.play();
    howl.fade(0, this.volume, FADE_MS);
    this.state = "ready";
    this.playing = true;
  }

  private stop(): void {
    const howl = this.howl;
    if (!howl) return;

    howl.fade(howl.volume(), 0, FADE_MS);
    window.setTimeout(() => {
      howl.stop();
      howl.unload();
    }, FADE_MS + 50);

    this.howl = null;
    this.currentTheme = null;
    this.playing = false;
  }

  ngOnDestroy(): void {
    this.howl?.stop();
    this.howl?.unload();
  }
}
