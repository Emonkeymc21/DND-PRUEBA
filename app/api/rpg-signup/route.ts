import { NextResponse } from "next/server";

/**
 * Submits the RPG signup form to Google Forms from the server (Netlify/Node),
 * avoiding browser CORS/iframe issues and handling multi-select fields correctly.
 *
 * IMPORTANT:
 * - Google Forms expects checkbox values as repeated fields with the same entry.* name.
 * - We fetch the viewform once to extract hidden tokens (fbzx / fvv) for best compatibility.
 */

const FORM_ID =
  "1FAIpQLScP2cSEbMdsVes4w8f1frB9hZSwP7xFsXjaY_Smm6AcGJsq3A";

const VIEWFORM_URL = `https://docs.google.com/forms/d/e/${FORM_ID}/viewform`;
const FORM_RESPONSE_URL = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`;

function extractHidden(html: string, name: string): string | null {
  // matches: <input type="hidden" name="fbzx" value="...">
  const re = new RegExp(
    `<input[^>]+name=["']${name}["'][^>]*value=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

function appendMaybe(params: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    for (const v of value) {
      if (v === undefined || v === null) continue;
      const s = String(v).trim();
      if (!s) continue;
      params.append(key, s);
    }
    return;
  }
  const s = String(value).trim();
  if (!s) return;
  params.append(key, s);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    // 1) Fetch viewform to extract tokens (helps for multi-page / stricter forms)
    const viewResp = await fetch(VIEWFORM_URL, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NetlifyFunctions/1.0; +https://www.netlify.com/)",
      },
      cache: "no-store",
    });

    const html = await viewResp.text();

    const fbzx = extractHidden(html, "fbzx");
    const fvv = extractHidden(html, "fvv") ?? "1";

    // 2) Build payload. Expect body to be { [fieldName]: string | string[] }
    const payload = new URLSearchParams();

    // Hidden required-ish fields
    appendMaybe(payload, "fvv", fvv);
    if (fbzx) appendMaybe(payload, "fbzx", fbzx);

    // Some forms are multi-page; pageHistory often helps. If not needed, Google ignores it.
    appendMaybe(payload, "pageHistory", "0,1,2,3");

    // 3) Append every incoming field as urlencoded. Repeats for arrays.
    if (body && typeof body === "object") {
      for (const [k, v] of Object.entries(body)) {
        // skip any client-only keys
        if (!k) continue;
        appendMaybe(payload, k, v as any);
      }
    }

    // Submit hint
    appendMaybe(payload, "submit", "Submit");

    // 4) POST to Google Forms
    const resp = await fetch(FORM_RESPONSE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent":
          "Mozilla/5.0 (compatible; NetlifyFunctions/1.0; +https://www.netlify.com/)",
        // Referer sometimes helps
        Referer: VIEWFORM_URL,
      },
      body: payload.toString(),
      redirect: "manual",
    });

    // Google Forms often responds 200/302. Treat 2xx or 3xx as success.
    const ok = resp.status >= 200 && resp.status < 400;

    return NextResponse.json(
      { ok, status: resp.status },
      { status: ok ? 200 : 502 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
