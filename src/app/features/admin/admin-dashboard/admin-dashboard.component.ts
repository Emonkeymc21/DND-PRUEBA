import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink, Router } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="title-caps font-display text-3xl font-extrabold text-primary">Panel</h1>
        <button
          type="button"
          (click)="logout()"
          class="rounded-full border border-border/60 px-4 py-2 text-xs font-semibold text-text/70 hover:border-primary/60"
        >
          Salir
        </button>
      </div>

      <div class="edge-top rounded-2xl border border-border/70 bg-card/70 p-5">
        <h2 class="font-display text-lg font-bold text-primary">Dónde ver las postulaciones</h2>
        <p class="mt-2 text-sm text-text/80">
          Cada envío llega directo a tu Google Form y, si configuraste el webhook, a tu canal de
          Discord. No hace falta este panel para verlas.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-2xl border border-border/70 bg-card/70 p-5">
          <h3 class="font-display text-base font-bold text-primary">Modelo de recomendación</h3>
          <p class="mt-2 text-sm text-muted">Ajustá los pesos de cada dimensión o corregí una recomendación.</p>
          <a routerLink="/admin/modelo" class="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
            Abrir →
          </a>
        </div>

        <div class="rounded-2xl border border-border/70 bg-card/70 p-5">
          <h3 class="font-display text-base font-bold text-primary">Árbol narrativo</h3>
          <p class="mt-2 text-sm text-muted">Agregá o editá nodos de la Encrucijada, hasta 15 opciones por nodo.</p>
          <a routerLink="/admin/arbol" class="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
            Abrir →
          </a>
        </div>
      </div>
    </div>
  `,
})
export class AdminDashboardComponent {
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl("/"));
  }
}
