import { cookies } from "next/headers";
import crypto from "node:crypto";

/**
 * Sesión de admin con cookie FIRMADA (HMAC).
 *
 * Antes la cookie guardaba la contraseña en texto plano y se comparaba directo.
 * Ahora guardamos `expiración.firma`, donde la firma se calcula con
 * ADMIN_PASSWORD como secreto. La contraseña nunca viaja al navegador.
 */

const COOKIE = "dnd_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días

function secret(): string | null {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass || pass.length < 8) return null;
  return pass;
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
  if (!key) return false;
  // Hasheamos ambos lados para que timingSafeEqual reciba siempre el mismo largo.
  const h = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
  return safeEqual(h(input), h(key));
}

export function isPasswordConfigured(): boolean {
  return secret() !== null;
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
  if (!key) return false;
  const store = await cookies();
  return verifyToken(store.get(COOKIE)?.value, key);
}

export async function setAdminCookie(): Promise<void> {
  const key = secret();
  if (!key) throw new Error("ADMIN_PASSWORD no configurada (mínimo 8 caracteres)");

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
