import { SYSTEM_PROMPT, buildUserPrompt, parseAiTurn, type TurnRequest, type AiTurn } from "@/lib/ai/prompt";

/**
 * Llamadas a los proveedores de IA por REST, con `fetch` pelado.
 *
 * Por qué sin SDK: `@google/generative-ai` y `openai` suman peso de instalación
 * y de cold start en serverless para hacer exactamente un POST con JSON. La
 * superficie que usamos es una función; no justifica una dependencia.
 *
 * Proveedor: se elige solo según qué API key exista.
 *   GEMINI_API_KEY  -> Gemini    (tiene capa gratis, https://aistudio.google.com/apikey)
 *   OPENAI_API_KEY  -> OpenAI    (de pago)
 *   ninguna         -> null, y el endpoint usa el evaluador heurístico
 */

export type AiProvider = "gemini" | "openai" | "none";

export function activeProvider(): AiProvider {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

const TIMEOUT_MS = 12_000;

async function postJson(url: string, body: unknown, headers: Record<string, string>): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      // No logueamos el body completo: puede traer la key en el mensaje de error.
      console.error(`[ai] ${url.split("?")[0]} respondió ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error("[ai] fallo de red o timeout:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(req: TurnRequest): Promise<AiTurn | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const data = (await postJson(
    url,
    {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: buildUserPrompt(req) }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 400,
        responseMimeType: "application/json",
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    },
    {},
  )) as
    | { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    | null;

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return parseAiTurn(text);
}

async function callOpenAI(req: TurnRequest): Promise<AiTurn | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const data = (await postJson(
    "https://api.openai.com/v1/chat/completions",
    {
      model,
      temperature: 0.9,
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(req) },
      ],
    },
    { authorization: `Bearer ${key}` },
  )) as { choices?: Array<{ message?: { content?: string } }> } | null;

  const text = data?.choices?.[0]?.message?.content ?? "";
  return parseAiTurn(text);
}

/** Devuelve null si no hay proveedor o si la llamada falló. Nunca lanza. */
export async function generateTurn(req: TurnRequest): Promise<AiTurn | null> {
  switch (activeProvider()) {
    case "gemini":
      return callGemini(req);
    case "openai":
      return callOpenAI(req);
    default:
      return null;
  }
}
