/**
 * Entorno de producción.
 *
 * IMPORTANTE: esto se sirve al navegador tal cual — nunca pongas acá un
 * secreto (webhook de Discord, token de Upstash, contraseña de admin). Esos
 * viven exclusivamente en server/.env, del lado del backend Express. Angular
 * sólo necesita saber a qué URL pegarle; el backend es quien sabe los
 * secretos y los usa sin exponerlos.
 */
export const environment = {
  production: true,
  // En producción, Angular y el backend se sirven desde el mismo dominio
  // (ver server/index.mjs, que también sirve dist/) así que un path relativo
  // alcanza. Si los separás en dos hosts, poné acá la URL completa del backend.
  apiBaseUrl: "/api",
};
