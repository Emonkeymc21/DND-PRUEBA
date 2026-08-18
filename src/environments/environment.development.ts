export const environment = {
  production: false,
  // En desarrollo, ng serve usa proxy.conf.json para reenviar /api al
  // backend Express en localhost:8787 — no hace falta poner la URL completa.
  apiBaseUrl: "/api",
};
