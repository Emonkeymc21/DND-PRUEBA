import { cookies } from "next/headers";

const COOKIE = "dnd_admin";

export function isAdminRequest() {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return false;
  const c = cookies().get(COOKIE)?.value;
  return c === pass;
}

export function setAdminCookie() {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) throw new Error("ADMIN_PASSWORD no configurada");
  cookies().set(COOKIE, pass, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearAdminCookie() {
  cookies().set(COOKIE, "", { path: "/", maxAge: 0 });
}
