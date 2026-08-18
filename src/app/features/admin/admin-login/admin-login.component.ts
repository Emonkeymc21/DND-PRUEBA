import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "app-admin-login",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mx-auto max-w-md space-y-6 py-8">
      <h1 class="title-caps font-display text-3xl font-extrabold text-primary">Ingreso</h1>

      <div class="rounded-xl border border-ember/60 bg-ember/10 p-4 text-sm text-text/90">
        <p class="font-semibold text-ember">⚠️ Recordatorio de seguridad</p>
        <p class="mt-1 text-xs">
          Si el backend no tiene <code>ADMIN_PASSWORD</code> configurada, acepta <code>admin123</code> —
          está en el código fuente, no es secreta. Configurá tu propia clave antes de publicar el sitio.
        </p>
      </div>

      <div class="edge-top rounded-2xl border border-border/70 bg-card/70 p-5">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Contraseña</span>
          <input
            type="password"
            [(ngModel)]="password"
            (keydown.enter)="submit()"
            autocomplete="current-password"
            class="w-full rounded-xl border border-border/70 bg-surface/80 px-4 py-3 text-base text-text outline-none transition focus:border-primary/70"
          />
        </label>

        <button
          type="button"
          (click)="submit()"
          [disabled]="loading || password.length === 0"
          class="mt-4 w-full rounded-xl border border-transparent bg-gradient-to-b from-primary to-primary-deep px-5 py-3 text-sm font-bold text-[rgb(12,10,16)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {{ loading ? "Verificando…" : "Entrar" }}
        </button>

        @if (error) {
          <p class="mt-3 text-sm text-ember">{{ error }}</p>
        }
      </div>
    </div>
  `,
})
export class AdminLoginComponent {
  password = "";
  loading = false;
  error: string | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  submit(): void {
    if (this.loading || this.password.length === 0) return;
    this.loading = true;
    this.error = null;

    this.auth.login(this.password).subscribe((res) => {
      this.loading = false;
      if (res.ok) {
        this.router.navigateByUrl("/admin");
      } else {
        this.error = res.error ?? "Contraseña incorrecta";
      }
    });
  }
}
