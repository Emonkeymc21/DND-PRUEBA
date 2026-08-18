import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { LocalBackupService } from "./core/services/local-backup.service";
import { AudioPlayerComponent } from "./shared/components/audio-player/audio-player.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, AudioPlayerComponent],
  template: `
    <div class="min-h-dvh">
      <header class="border-b border-border/60">
        <nav class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <a routerLink="/" class="font-display text-lg font-bold text-primary shrink-0">La Mesa Perdida</a>
          <div class="flex items-center gap-4 text-sm">
            <a routerLink="/encrucijada" routerLinkActive="text-primary" class="text-text/80 hover:text-primary">
              Encrucijada
            </a>
            <a routerLink="/bestiario" routerLinkActive="text-primary" class="text-text/80 hover:text-primary">
              Bestiario
            </a>
            <app-audio-player theme="fantasy" />
          </div>
        </nav>
      </header>

      <main class="mx-auto max-w-6xl px-4 py-10">
        <router-outlet />
      </main>

      <footer class="mt-20 border-t border-border/60 py-8 text-center text-xs text-muted">
        © {{ year }} La Mesa Perdida. Que tengas buenas tiradas 🎲
      </footer>
    </div>
  `,
})
export class AppComponent implements OnInit {
  year = new Date().getFullYear();

  constructor(private backup: LocalBackupService) {}

  ngOnInit(): void {
    // Reintenta postulaciones que quedaron encoladas (sin conexión, backend
    // caído en su momento) apenas arranca la app, y de nuevo si vuelve la red.
    this.backup.setupAutoFlush();
  }
}
