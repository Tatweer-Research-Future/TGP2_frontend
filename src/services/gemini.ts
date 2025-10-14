// Simple Gemini client using fetch to avoid extra dependencies

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

export async function generateWithGemini(params: {
  user: string;
  system?: string;
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
  const model = "gemini-2.5-flash";
  const endpoint = `${API_BASE}/${model}:generateContent?key=${apiKey}`;

  const tools: any[] = [];
  if (params.urls && params.urls.length > 0) {
    tools.push({ url_context: {} });
  }

  const res = await fetch(endpoint, {
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
  urls?: string[];
  additionalParts?: any[];
}): Promise<any> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error(
      "Missing VITE_GEMINI_API_KEY. Add it to your .env and restart the dev server."
    );
  }

  const model = "gemini-2.5-flash";
  const endpoint = `${API_BASE}/${model}:generateContent?key=${apiKey}`;

  const tools: any[] = [];
  if (params.urls && params.urls.length > 0) {
    tools.push({ url_context: {} });
  }

  const res = await fetch(endpoint, {
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


