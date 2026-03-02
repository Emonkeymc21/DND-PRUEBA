import { cookies } from "next/headers";

const COOKIE = "dnd_admin";

/**
 * Next 15 puede tipar cookies() como Promise<ReadonlyRequestCookies>.
 * `await` funciona tanto si devuelve Promise como si devuelve el objeto directo.
 */
export async function isAdminRequest() {
  const pass = process.env.ADMIN_PASSWORD ?? "Monkey1021*";
  
  const store = await cookies();
  const c = store.get(COOKIE)?.value;
  return c === pass;
}

export async function setAdminCookie() {
  const pass = process.env.ADMIN_PASSWORD ?? "Monkey1021*";
  if (!pass) throw new Error("ADMIN_PASSWORD no configurada");

  const store = await cookies();
  store.set(COOKIE, pass, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.set(COOKIE, "", { path: "/", maxAge: 0 });
}
