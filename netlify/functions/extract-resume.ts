// Netlify function: Fetch a PDF from a public URL and extract plain text
// Uses pdf-parse (CommonJS) via dynamic import to avoid bundling issues

type Handler = (event: any) => Promise<{ statusCode: number; headers?: Record<string, string>; body: string }>;

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
    const { url } = JSON.parse(event.body || "{}");
    if (!url || typeof url !== "string") {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing 'url'" }) };
    }

    const res = await fetch(url);
    if (!res.ok) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: `Failed to fetch PDF: ${res.status} ${res.statusText}` }),
      };
    }
    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // Lazy import pdf-parse (CJS)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse");
    const parsed = await pdfParse(buffer);

    const text: string = (parsed?.text || "").trim();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message || "Unexpected error" }),
    };
  }
};


