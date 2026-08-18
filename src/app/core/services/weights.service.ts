import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { environment } from "../../../environments/environment";
import { defaultWeights, type Weights } from "./ml-recommend.service";

/**
 * Pesos del recomendador, gestionados por el backend (que a su vez los
 * persiste en Upstash si está configurado, o en memoria del proceso si no).
 *
 * Angular NUNCA habla con Upstash directamente: eso requeriría embeber el
 * token de escritura de Upstash en el bundle público, dándole a cualquier
 * visitante del sitio permiso de lectura Y ESCRITURA sobre tu base de datos.
 * El servicio Express (server/index.mjs) es quien retiene ese token.
 */
@Injectable({ providedIn: "root" })
export class WeightsService {
  private http = inject(HttpClient);

  /** Signal con el último valor cargado, para que los componentes puedan leerlo reactivamente. */
  readonly current = signal<Weights>(defaultWeights());

  load(): Observable<Weights> {
    return this.http
      .get<Weights>(`${environment.apiBaseUrl}/ml/weights`)
      .pipe(tap((w) => this.current.set(w)));
  }

  saveManual(weights: Weights): Observable<{ ok: boolean; weights: Weights; persisted: boolean }> {
    return this.http
      .post<{ ok: boolean; weights: Weights; persisted: boolean }>(
        `${environment.apiBaseUrl}/ml/weights`,
        { mode: "manual", weights },
      )
      .pipe(tap((res) => this.current.set(res.weights)));
  }

  reset(): Observable<{ ok: boolean; weights: Weights }> {
    return this.http
      .post<{ ok: boolean; weights: Weights }>(`${environment.apiBaseUrl}/ml/weights`, { mode: "reset" })
      .pipe(tap((res) => this.current.set(res.weights)));
  }

  /**
   * `weights` acá ya tiene que venir calculado (ver
   * MlRecommendService.learnFromFeedback) — el backend sólo persiste y
   * registra el historial, no repite el cálculo. Evita duplicar la tabla de
   * campañas en dos lugares y mantener las dos copias sincronizadas.
   */
  correct(payload: {
    weights: Weights;
    predicted: string;
    actual: string;
  }): Observable<{ ok: boolean; weights: Weights; persisted: boolean }> {
    return this.http
      .post<{ ok: boolean; weights: Weights; persisted: boolean }>(`${environment.apiBaseUrl}/ml/weights`, {
        mode: "correction",
        ...payload,
      })
      .pipe(tap((res) => this.current.set(res.weights)));
  }

  history(): Observable<{ predicted: string; actual: string; createdAt: string }[]> {
    return this.http.get<{ predicted: string; actual: string; createdAt: string }[]>(
      `${environment.apiBaseUrl}/ml/weights/history`,
    );
  }
}
