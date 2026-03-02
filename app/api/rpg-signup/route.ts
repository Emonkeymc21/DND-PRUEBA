import { NextResponse } from "next/server";

export const runtime = "nodejs";

const FORM_ID = "1FAIpQLScP2cSEbMdsVes4w8f1frB9hZSwP7xFsXjaY_Smm6AcGJsq3A";
const VIEW_URL = `https://docs.google.com/forms/d/e/${FORM_ID}/viewform`;
const POST_URL = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`;

function pickFbZx(html: string): string | null {
  const m = html.match(/name="fbzx"\s+value="([^"]+)"/);
  return m?.[1] ?? null;
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // 1) Fetch the form HTML to extract fbzx token (Google Forms often needs it)
    const viewResp = await fetch(VIEW_URL, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      // avoid any caching surprises
      cache: "no-store",
    });
    const html = await viewResp.text();
    const fbzx = pickFbZx(html);

    const payload = new URLSearchParams();

    // Standard hidden fields
    payload.set("fvv", "1");
    payload.set("pageHistory", "0");
    if (fbzx) payload.set("fbzx", fbzx);
    payload.set("submit", "Submit");

    // Map incoming fields to Google Forms entry names
    // NOTE: keep these IDs in sync with your form.
    if (data.email) payload.set("emailAddress", String(data.email));
    if (data.name) payload.set("entry.592377339", String(data.name));
    if (data.instagram) payload.set("entry.1145937670", String(data.instagram));
    if (data.experience) payload.set("entry.1662985932", String(data.experience));
    if (data.rules) payload.set("entry.259189639", String(data.rules));
    if (data.theme) payload.set("entry.1977972677", String(data.theme));
    if (data.style) payload.set("entry.430852753", String(data.style));
    if (data.playMode) payload.set("entry.2000145625", String(data.playMode));
    if (data.freq) payload.set("entry.432896089", String(data.freq));
    if (data.avoid) payload.set("entry.36863628", String(data.avoid));
    if (data.notes) payload.set("entry.28201251", String(data.notes));

    // Availability: may be one value or array of values. We keep the 3 separate entry IDs used in the form.
    const availability = data.availability;
    if (Array.isArray(availability)) {
      if (availability[0]) payload.set("entry.2140878283", String(availability[0]));
      if (availability[1]) payload.set("entry.2065289993", String(availability[1]));
      if (availability[2]) payload.set("entry.876431454", String(availability[2]));
    } else if (typeof availability === "string" && availability) {
      payload.set("entry.2140878283", availability);
    }

    const postResp = await fetch(POST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*",
      },
      body: payload.toString(),
      redirect: "manual",
      cache: "no-store",
    });

    // Google Forms often returns 200 or 302 on success.
    const ok = postResp.status === 200 || postResp.status === 302 || postResp.status === 0;

    return NextResponse.json(
      {
        ok,
        status: postResp.status,
        fbzx: fbzx ? "present" : "missing",
      },
      { status: ok ? 200 : 500 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
