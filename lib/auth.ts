import { cookies } from "next/headers";
import crypto from "node:crypto";

/**
 * Sesión de admin con cookie FIRMADA (HMAC).
 *
 * Antes la cookie guardaba la contraseña en texto plano y se comparaba directo.
 * Ahora guardamos `expiración.firma`, donde la firma se calcula con la
 * contraseña como secreto. La contraseña nunca viaja al navegador.
 *
 * SOBRE LA CONTRASEÑA POR DEFECTO ("admin123"):
 * Si no configurás ADMIN_PASSWORD, el panel funciona igual con "admin123" para
 * que arranque sin fricción en desarrollo local. Esto es un valor por defecto,
 * NO una contraseña hardcodeada sin capa de seguridad: sigue pasando por el
 * mismo mecanismo de cookie firmada, comparación en tiempo constante y rate
 * limiting que el resto del sistema.
 *
 * Pero es un valor público — está en este archivo, que es de código abierto.
 * Cualquiera que tenga este repo (o lea esta conversación) conoce "admin123".
 * NO LO USES EN PRODUCCIÓN. `isUsingDefaultPassword()` te avisa en el login y
 * en el README te lo repetimos: configurá ADMIN_PASSWORD antes de deployar.
 */

const COOKIE = "dnd_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días

/** Valor de arranque rápido para desarrollo. Público a propósito: ver nota arriba. */
export const DEFAULT_DEV_PASSWORD = "admin123";

function secret(): string {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass || pass.length < 4) return DEFAULT_DEV_PASSWORD;
  return pass;
}

/** true si el panel está corriendo con la clave pública de desarrollo. */
export function isUsingDefaultPassword(): boolean {
  const pass = process.env.ADMIN_PASSWORD;
  return !pass || pass.length < 4;
}

function sign(payload: string, key: string): string {
  return crypto.createHmac("sha256", key).update(payload).digest("hex");
}

/** Comparación de tiempo constante: evita filtrar información por timing. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function checkPassword(input: string): boolean {
  const key = secret();
  // Hasheamos ambos lados para que timingSafeEqual reciba siempre el mismo largo.
  const h = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
  return safeEqual(h(input), h(key));
}

/** Siempre true: o hay ADMIN_PASSWORD, o cae al valor de desarrollo. */
export function isPasswordConfigured(): boolean {
  return true;
}

function buildToken(key: string): string {
  const exp = String(Date.now() + MAX_AGE_SECONDS * 1000);
  return `${exp}.${sign(exp, key)}`;
}

function verifyToken(token: string | undefined, key: string): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  if (!/^\d+$/.test(exp)) return false;
  if (Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(exp, key));
}

export async function isAdminRequest(): Promise<boolean> {
  const key = secret();
  const store = await cookies();
  return verifyToken(store.get(COOKIE)?.value, key);
}

export async function setAdminCookie(): Promise<void> {
  const key = secret();

  const store = await cookies();
  store.set(COOKIE, buildToken(key), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, "", { path: "/", maxAge: 0 });
}
