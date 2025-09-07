// Simple Gemini client using fetch to avoid extra dependencies

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL =
  (import.meta.env.VITE_GEMINI_MODEL as string | undefined) ||
  "gemini-1.5-flash-latest";

export async function generateWithGemini(params: {
  user: string;
  system?: string;
  model?: string;
  additionalParts?: any[]; // optional extra parts like inline_data
}): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error(
      "Missing VITE_GEMINI_API_KEY. Add it to your .env and restart the dev server."
    );
  }
  const model = params.model || DEFAULT_MODEL;
  const endpoint = `${API_BASE}/${model}:generateContent?key=${apiKey}`;

  let res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: params.user }, ...(params.additionalParts ?? [])],
        },
      ],
      ...(params.system
        ? { system_instruction: { parts: [{ text: params.system }] } }
        : {}),
    }),
  });

  if (res.status === 404 && model !== "gemini-1.5-flash-latest") {
    // Retry with a safe default if the chosen model isn't available for this API version
    res = await fetch(
      `${API_BASE}/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: params.user }, ...(params.additionalParts ?? [])],
            },
          ],
          ...(params.system
            ? { system_instruction: { parts: [{ text: params.system }] } }
            : {}),
        }),
      }
    );
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Gemini request failed (model=${model}): ${res.status} ${text}`
    );
  }

  const data = (await res.json()) as any;
  // Try to extract text from response
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join(" ") ??
    data?.candidates?.[0]?.output_text ??
    "";
  return String(text || "").trim();
}


