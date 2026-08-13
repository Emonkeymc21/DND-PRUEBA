/**
 * Mapeo hacia Google Forms.
 *
 * IDs de entry.XXX según la especificación exacta del formulario real:
 *   Nombre                → entry.592377339
 *   Contacto               → entry.1145937670
 *   Experiencia             → entry.1662985932
 *   Sistema                  → entry.259189639
 *   Temática                  → entry.1977972677
 *   Modalidad                  → entry.2000145625
 *   Frecuencia                   → entry.432896089
 *   Disponibilidad (3 checkboxes) → entry.876431454, entry.2140878283, entry.2065289993
 *   Líneas rojas (2 checkboxes)     → entry.36863628, entry.28201251
 *
 * IMPORTANTE — lo único que no puedo completar por vos:
 * Google no expone la URL base de un formulario a partir de sus IDs de
 * campo; esa URL (`https://docs.google.com/forms/d/e/FORM_ID/formResponse`)
 * es propia de CADA formulario y sólo la tenés vos, como dueño del Google
 * Form. Se configura en `GOOGLE_FORM_ACTION_URL` (ver .env.example).
 *
 * Cómo conseguirla: abrí tu formulario en modo edición → los tres puntos
 * arriba a la derecha → "Obtener enlace precargado" (o inspeccioná el HTML
 * del formulario público buscando el atributo `action` del `<form>`) → la
 * URL termina en `/formResponse`. Sin esa variable configurada, el envío a
 * Google Forms queda desactivado automáticamente y el sitio sigue
 * funcionando igual por Discord + respaldo local — nunca se cae por esto.
 *
 * Por qué el POST va desde el servidor (Next.js API route) y no desde el
 * navegador: un fetch hecho desde el cliente contra un dominio ajeno choca
 * con CORS, y el truco típico de esquivarlo con `mode: "no-cors"` te deja sin
 * poder leer si Google aceptó o rechazó el envío — es la misma clase de
 * fragilidad que el viejo iframe oculto. Un fetch servidor-a-servidor no
 * tiene restricción de CORS (es un concepto exclusivo del navegador) y sí
 * podemos leer el código de estado de la respuesta.
 */

export type SignupFields = {
  nombre: string;
  contacto: string;
  experiencia: string;
  sistema: string;
  tematicas: string[];
  modalidad: string;
  frecuencia: string;
  disponibilidad: string[];
  lineasRojas: string[];
};

const ENTRY = {
  nombre: "entry.592377339",
  contacto: "entry.1145937670",
  experiencia: "entry.1662985932",
  sistema: "entry.259189639",
  tematica: "entry.1977972677",
  modalidad: "entry.2000145625",
  frecuencia: "entry.432896089",
  // Google trata cada checkbox de un grupo como un entry propio en vez de
  // un array: si el formulario tiene 3 casillas de horario, son 3 IDs.
  disponibilidad: ["entry.876431454", "entry.2140878283", "entry.2065289993"],
  lineasRojas: ["entry.36863628", "entry.28201251"],
} as const;

export function isGoogleFormsConfigured(): boolean {
  const url = process.env.GOOGLE_FORM_ACTION_URL ?? "";
  return url.startsWith("https://docs.google.com/forms/") && url.includes("/formResponse");
}

/**
 * Arma el body `application/x-www-form-urlencoded` que Google Forms espera.
 *
 * Las temáticas (multi-selección) se concatenan en el campo de Temática con
 * " · " porque el formulario real tiene un solo entry para eso, no uno por
 * temática — si tu formulario usa checkboxes en vez de un campo de texto para
 * temática, cambiá esta línea por el mismo patrón que `disponibilidad`.
 */
export function buildGoogleFormsBody(fields: SignupFields): URLSearchParams {
  const params = new URLSearchParams();

  params.append(ENTRY.nombre, fields.nombre);
  params.append(ENTRY.contacto, fields.contacto);
  params.append(ENTRY.experiencia, fields.experiencia);
  params.append(ENTRY.sistema, fields.sistema);
  params.append(ENTRY.tematica, fields.tematicas.join(" · "));
  params.append(ENTRY.modalidad, fields.modalidad);
  params.append(ENTRY.frecuencia, fields.frecuencia);

  fields.disponibilidad.slice(0, ENTRY.disponibilidad.length).forEach((value, i) => {
    params.append(ENTRY.disponibilidad[i]!, value);
  });

  fields.lineasRojas.slice(0, ENTRY.lineasRojas.length).forEach((value, i) => {
    params.append(ENTRY.lineasRojas[i]!, value);
  });

  return params;
}

/**
 * Envía la postulación a Google Forms desde el servidor.
 *
 * Devuelve true si Google respondió con éxito. Un 200 de Google Forms no es
 * una garantía absoluta de que la fila quedó en la hoja de respuestas (Google
 * no publica un contrato de API estable para esto), pero es la señal más
 * confiable disponible sin usar la Forms API oficial con OAuth — que
 * requeriría credenciales de servicio que este proyecto no tiene forma de
 * generar por vos. Por eso este envío siempre va acompañado del webhook de
 * Discord como segunda confirmación real.
 */
export async function submitToGoogleForms(fields: SignupFields): Promise<boolean> {
  const actionUrl = process.env.GOOGLE_FORM_ACTION_URL;
  if (!actionUrl || !isGoogleFormsConfigured()) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(actionUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: buildGoogleFormsBody(fields).toString(),
      signal: controller.signal,
      redirect: "follow",
    });

    // Google redirige a una página de "gracias" tras un envío válido; fetch
    // sigue esa redirección y el status final suele ser 200. Un 4xx/5xx acá
    // sí es una señal confiable de que algo salió mal (form cerrado, URL
    // vencida, etc).
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
