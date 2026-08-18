import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, catchError, of } from "rxjs";
import { environment } from "../../../environments/environment";
import { LocalBackupService } from "./local-backup.service";

export type SignupPayload = {
  nombre: string;
  contacto: string;
  experiencia: string;
  sistema: string;
  tematicas: string[];
  modalidad: string;
  frecuencia: string;
  disponibilidad: string[];
  lineasRojas: string[];
  notas: string;
  mlTags: string[];
  mlVector: Record<string, number> | null;
  mlArchetype: string | null;
  mlCampaign: string | null;
  source: string;
  website: string; // honeypot
  elapsedMs: number;
};

export type SignupResponse = { ok: boolean; delivered?: boolean; error?: string };

/**
 * Envía la postulación al backend (que hace el POST a Google Forms
 * server-to-server y dispara el webhook de Discord — igual que en la
 * versión Next.js, ver server/index.mjs).
 *
 * Si el backend no responde (sin conexión, servidor caído), la postulación
 * se guarda en localStorage vía LocalBackupService y se reintenta sola. La
 * persona siempre ve la misma pantalla de éxito, nunca un cartel de error.
 */
@Injectable({ providedIn: "root" })
export class SignupService {
  private http = inject(HttpClient);
  private backup = inject(LocalBackupService);

  submit(payload: SignupPayload): Observable<{ status: "sent" | "queued" }> {
    return new Observable((subscriber) => {
      this.http
        .post<SignupResponse>(`${environment.apiBaseUrl}/rpg-signup`, payload)
        .pipe(
          catchError(() => of<SignupResponse>({ ok: false })),
        )
        .subscribe((res) => {
          if (res.ok) {
            subscriber.next({ status: "sent" });
          } else {
            this.backup.enqueue(payload);
            subscriber.next({ status: "queued" });
          }
          subscriber.complete();
        });
    });
  }
}
