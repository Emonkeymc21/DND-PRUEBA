import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideRouter, withComponentInputBinding } from "@angular/router";
import { provideHttpClient, withFetch } from "@angular/common/http";
import { provideAnimations } from "@angular/platform-browser/animations";

import { routes } from "./app.routes";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    // withFetch: usa el fetch nativo del navegador en vez de XHR. Es el
    // transporte recomendado para apps nuevas y evita un warning de Angular
    // 17+ sobre interceptores/fetch en SSR (no aplica acá porque esto es
    // client-only, pero mantiene el proyecto alineado con las prácticas
    // actuales del framework).
    provideHttpClient(withFetch()),
    provideAnimations(),
  ],
};
