import { Routes } from "@angular/router";
import { adminGuard } from "./core/services/auth.service";

/**
 * Todas las rutas van con `loadComponent` (lazy loading real, un chunk por
 * ruta) tal como pide la especificación. El guard de /admin/* pega contra
 * el backend (sesión por cookie httpOnly) antes de dejar pasar — la
 * verificación de "¿sos admin?" nunca se hace mirando algo que vive en el
 * bundle del cliente.
 */
export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./features/home/home.component").then((m) => m.HomeComponent),
    title: "La Mesa Perdida — Mesas de rol en español",
  },
  {
    path: "encrucijada",
    loadComponent: () =>
      import("./features/encrucijada/encrucijada.component").then((m) => m.EncrucijadaComponent),
    title: "Encrucijada — La Mesa Perdida",
  },
  {
    path: "bestiario",
    loadComponent: () =>
      import("./features/bestiario/bestiario.component").then((m) => m.BestiarioComponent),
    title: "Bestiario — La Mesa Perdida",
  },
  {
    path: "admin/login",
    loadComponent: () =>
      import("./features/admin/admin-login/admin-login.component").then((m) => m.AdminLoginComponent),
    title: "Ingreso admin",
  },
  {
    path: "admin",
    canActivate: [adminGuard],
    loadComponent: () =>
      import("./features/admin/admin-dashboard/admin-dashboard.component").then(
        (m) => m.AdminDashboardComponent,
      ),
    title: "Panel",
  },
  {
    path: "admin/modelo",
    canActivate: [adminGuard],
    loadComponent: () =>
      import("./features/admin/admin-modelo/admin-modelo.component").then((m) => m.AdminModeloComponent),
    title: "Modelo",
  },
  {
    path: "admin/arbol",
    canActivate: [adminGuard],
    loadComponent: () =>
      import("./features/admin/admin-arbol/admin-arbol.component").then((m) => m.AdminArbolComponent),
    title: "Árbol narrativo",
  },
  { path: "**", redirectTo: "" },
];
