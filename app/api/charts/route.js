import OpenAI from "openai";
import { isMissingEnvError } from "@/lib/infrastructure-errors";
import { normalizeChartPayload } from "@/lib/chart-spec";

export const runtime = "nodejs";

const SYSTEM = `You extract chart-ready numeric series from CFO / financial summary text.
Return ONLY a JSON object (no markdown fences) with this shape:
{"charts":[{"type":"bar","title":"Short title","unit":"optional unit label e.g. USD billions","points":[{"name":"Category or period","value":123.4}]}]}
Rules:
- At most 3 charts.
- type is always "bar" or "line" (use "line" for time series / sequential periods).
- Each chart must have at least 2 points; "value" must be a finite number (not strings).
- "name" must be short labels (product, region, quarter, etc.).
- If there are no clear comparable numbers, return {"charts":[]}.
- Do not invent numbers; only use figures clearly implied in the text.`;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return Response.json({ error: "Summary text is required", charts: [] }, { status: 400 });
    }

    const truncated = text.length > 14000 ? `${text.slice(0, 14000)}\n…` : text;
    const openai = getOpenAI();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Extract charts from this summary:\n\n${truncated}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.15,
      max_tokens: 1800
    });

    const rawText = completion.choices[0]?.message?.content || "{}";
    let parsed = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return Response.json({ charts: [], hint: "Could not parse chart model output." });
    }

    const { charts } = normalizeChartPayload(parsed);
    return Response.json({ charts });
  } catch (error) {
    if (isMissingEnvError(error)) {
      return Response.json(
        { charts: [], hint: error?.message || "Configure OPENAI_API_KEY in .env.local." },
        { status: 503 }
      );
    }
    return Response.json(
      { charts: [], error: error?.message || "Chart extraction failed" },
      { status: 500 }
    );
  }
}
