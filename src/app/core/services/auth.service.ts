import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router, type CanActivateFn } from "@angular/router";
import { Observable, catchError, map, of, tap } from "rxjs";
import { environment } from "../../../environments/environment";

/**
 * Sesión de admin.
 *
 * El backend (server/index.mjs) es quien firma y valida la cookie httpOnly —
 * exactamente el mismo mecanismo HMAC que tenía la versión Next.js. Angular
 * nunca ve la contraseña ni la clave de firma; sólo sabe "sí" o "no" según lo
 * que responde /api/admin/session.
 */
@Injectable({ providedIn: "root" })
export class AuthService {
  private http = inject(HttpClient);
  private checked = false;
  private isAdminCached = false;

  login(password: string): Observable<{ ok: boolean; error?: string }> {
    return this.http
      .post<{ ok: boolean; error?: string }>(
        `${environment.apiBaseUrl}/admin/login`,
        { password },
        { withCredentials: true },
      )
      .pipe(
        tap((res) => {
          this.checked = true;
          this.isAdminCached = !!res.ok;
        }),
        catchError(() => {
          this.checked = true;
          this.isAdminCached = false;
          return of({ ok: false, error: "Error de red." });
        }),
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${environment.apiBaseUrl}/admin/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this.checked = true;
          this.isAdminCached = false;
        }),
        catchError(() => of(void 0)),
      );
  }

  /** Consulta al backend si la cookie actual es válida. Cachea por sesión de navegación. */
  checkSession(): Observable<boolean> {
    if (this.checked) return of(this.isAdminCached);

    return this.http
      .get<{ isAdmin: boolean }>(`${environment.apiBaseUrl}/admin/session`, { withCredentials: true })
      .pipe(
        map((res) => res.isAdmin),
        tap((isAdmin) => {
          this.checked = true;
          this.isAdminCached = isAdmin;
        }),
        catchError(() => {
          this.checked = true;
          this.isAdminCached = false;
          return of(false);
        }),
      );
  }

  invalidate(): void {
    this.checked = false;
  }
}

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.checkSession().pipe(
    map((isAdmin) => (isAdmin ? true : router.createUrlTree(["/admin/login"]))),
  );
};
