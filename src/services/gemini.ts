// Simple Gemini client using fetch to avoid extra dependencies

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL =
  (import.meta.env.VITE_GEMINI_MODEL as string | undefined) ||
  "gemini-1.5-flash-latest";

export async function generateWithGemini(params: {
  user: string;
  system?: string;
  model?: string;
  urls?: string[]; // enable URL Context tool and include these URLs in the request
  additionalParts?: any[]; // optional extra parts like inline_data
}): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error(
      "Missing VITE_GEMINI_API_KEY. Add it to your .env and restart the dev server."
    );
  }
  // Prefer 2.5 when using URL Context; otherwise use default or provided
  let model = params.model || (params.urls && params.urls.length > 0 ? "gemini-2.5-flash" : DEFAULT_MODEL);
  const endpoint = `${API_BASE}/${model}:generateContent?key=${apiKey}`;

  const tools: any[] = [];
  if (params.urls && params.urls.length > 0) {
    tools.push({ url_context: {} });
  }

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
      ...(tools.length > 0 ? { tools } : {}),
      ...(params.system
        ? { system_instruction: { parts: [{ text: params.system }] } }
        : {}),
    }),
  });

  if (res.status === 404 && (params.urls?.length ?? 0) > 0 && model !== "gemini-2.5-flash") {
    // Retry with a URL-context-capable model
    model = "gemini-2.5-flash";
    res = await fetch(
      `${API_BASE}/${model}:generateContent?key=${apiKey}`,
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
          ...(tools.length > 0 ? { tools } : {}),
          ...(params.system
            ? { system_instruction: { parts: [{ text: params.system }] } }
            : {}),
        }),
      }
    );
  }

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
          ...(tools.length > 0 ? { tools } : {}),
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

// Low-level variant that returns the full parsed JSON response including
// url_context_metadata for debugging URL Context issues
export async function generateWithGeminiRaw(params: {
  user: string;
  system?: string;
  model?: string;
  urls?: string[];
  additionalParts?: any[];
}): Promise<any> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error(
      "Missing VITE_GEMINI_API_KEY. Add it to your .env and restart the dev server."
    );
  }

  let model = params.model || (params.urls && params.urls.length > 0 ? "gemini-2.5-flash" : DEFAULT_MODEL);
  const endpoint = `${API_BASE}/${model}:generateContent?key=${apiKey}`;

  const tools: any[] = [];
  if (params.urls && params.urls.length > 0) {
    tools.push({ url_context: {} });
  }

  let res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: params.user }, ...(params.additionalParts ?? [])] },
      ],
      ...(tools.length > 0 ? { tools } : {}),
      ...(params.system ? { system_instruction: { parts: [{ text: params.system }] } } : {}),
    }),
  });

  if (res.status === 404 && (params.urls?.length ?? 0) > 0 && model !== "gemini-2.5-flash") {
    model = "gemini-2.5-flash";
    res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: params.user }, ...(params.additionalParts ?? [])] },
        ],
        ...(tools.length > 0 ? { tools } : {}),
        ...(params.system ? { system_instruction: { parts: [{ text: params.system }] } } : {}),
      }),
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini request failed (model=${model}): ${res.status} ${text}`);
  }

  return res.json();
}

export async function extractResumeTextLocally(resumeUrl: string): Promise<string> {
  const endpoint = "/.netlify/functions/extract-resume";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: resumeUrl }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`extract-resume failed: ${res.status} ${msg}`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text || "").trim();
}


