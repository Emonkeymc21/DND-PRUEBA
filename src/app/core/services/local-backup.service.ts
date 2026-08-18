import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import type { SignupPayload } from "./signup.service";

const QUEUE_KEY = "mesa_signup_queue_v1";
const MAX_QUEUE = 20;

type PendingSignup = { id: string; payload: SignupPayload; createdAt: number; attempts: number };

/**
 * Cola de reintento en localStorage. Puerto directo de lib/signup-backup.ts
 * de la versión Next.js — misma lógica, mismo motivo: nunca perder una
 * postulación en silencio, nunca mostrarle a la persona un cartel de error
 * por algo que no depende de ella.
 */
@Injectable({ providedIn: "root" })
export class LocalBackupService {
  private http = inject(HttpClient);

  private readQueue(): PendingSignup[] {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeQueue(queue: PendingSignup[]): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
    } catch {
      // localStorage lleno o bloqueado (modo privado): no hay más para hacer acá.
    }
  }

  enqueue(payload: SignupPayload): string {
    const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const queue = this.readQueue();
    queue.push({ id, payload, createdAt: Date.now(), attempts: 0 });
    this.writeQueue(queue);
    return id;
  }

  pendingCount(): number {
    return this.readQueue().length;
  }

  /** Reintenta todo lo que está en cola. Se llama al arrancar la app y al recuperar conexión. */
  flush(): void {
    const queue = this.readQueue();
    if (queue.length === 0) return;

    const remaining: PendingSignup[] = [];
    let pending = queue.length;

    queue.forEach((item) => {
      this.http.post(`${environment.apiBaseUrl}/rpg-signup`, item.payload).subscribe({
        next: () => {
          pending -= 1;
          if (pending === 0) this.writeQueue(remaining);
        },
        error: () => {
          remaining.push({ ...item, attempts: item.attempts + 1 });
          pending -= 1;
          if (pending === 0) this.writeQueue(remaining);
        },
      });
    });
  }

  setupAutoFlush(): void {
    this.flush();
    window.addEventListener("online", () => this.flush());
  }
}
