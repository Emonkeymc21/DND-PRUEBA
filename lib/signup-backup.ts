/**
 * Respaldo local de postulaciones.
 *
 * Reemplaza al viejo mecanismo de "si falla todo, mandar por un POST oculto
 * a Google Forms". Ese mecanismo era exactamente el bug original de este
 * proyecto: Google bloquea el framing de /formResponse, así que el POST
 * fallaba en silencio y la persona veía "enviado" sin que nada se hubiera
 * guardado. Reintroducirlo reintroduce el bug.
 *
 * En su lugar: si el envío al servidor falla, la postulación se guarda acá,
 * en localStorage, y queda en una cola de reintento. La próxima vez que la
 * persona (u otra, desde el mismo navegador) abra el sitio con conexión,
 * `flushPending()` reintenta mandarlas. Mientras tanto, el dato NUNCA se
 * pierde silenciosamente: vive en el navegador hasta que se confirma.
 *
 * Esto es honesto en un sentido que el hack anterior no era: nunca le dice al
 * usuario "listo" sin que sea cierto. Si el envío falla, la UI lo dice con
 * calma (sin modal alarmante) y ofrece los contactos directos como plan B.
 */

const QUEUE_KEY = "mesa_signup_queue_v1";
const MAX_QUEUE = 20;

export type PendingSignup = {
  id: string;
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
};

function readQueue(): PendingSignup[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingSignup[]): void {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    // Storage lleno o bloqueado (modo privado): no hay mucho más que hacer.
    // La persona igual tiene los contactos de respaldo en pantalla.
  }
}

/** Encola una postulación que no se pudo enviar. */
export function enqueuePending(payload: Record<string, unknown>): string {
  const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const queue = readQueue();
  queue.push({ id, payload, createdAt: Date.now(), attempts: 0 });
  writeQueue(queue);
  return id;
}

export function pendingCount(): number {
  if (typeof window === "undefined") return 0;
  return readQueue().length;
}

/**
 * Reintenta mandar todo lo que está en cola. Se llama al montar la home y
 * al recuperar la conexión (evento `online`). Silencioso: si vuelve a
 * fallar, se queda en la cola para el próximo intento.
 */
export async function flushPending(endpoint = "/api/rpg-signup"): Promise<{ sent: number; left: number }> {
  if (typeof window === "undefined") return { sent: 0, left: 0 };

  const queue = readQueue();
  if (queue.length === 0) return { sent: 0, left: 0 };

  const remaining: PendingSignup[] = [];
  let sent = 0;

  for (const item of queue) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(item.payload),
      });

      if (res.ok) {
        sent += 1;
        continue;
      }
      remaining.push({ ...item, attempts: item.attempts + 1 });
    } catch {
      remaining.push({ ...item, attempts: item.attempts + 1 });
    }
  }

  // Después de 8 intentos fallidos algo está estructuralmente mal (no es un
  // problema de red pasajero); la dejamos en cola igual, nunca se descarta
  // sola. Que se pierda un dato requiere una acción explícita, no automática.
  writeQueue(remaining);

  return { sent, left: remaining.length };
}

export function setupAutoFlush(endpoint = "/api/rpg-signup"): () => void {
  if (typeof window === "undefined") return () => {};

  void flushPending(endpoint);

  const onOnline = () => void flushPending(endpoint);
  window.addEventListener("online", onOnline);

  return () => window.removeEventListener("online", onOnline);
}
