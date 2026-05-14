import { isMissingEnvError, isVectorInfrastructureError } from "@/lib/infrastructure-errors";
import { generateSummary } from "@/lib/rag";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Request body must be JSON with a filename field." },
        { status: 400 }
      );
    }
    const { filename } = body;
    if (!filename?.trim()) {
      return Response.json({ error: "Filename is required" }, { status: 400 });
    }

    const summary = await generateSummary(filename.trim());
    return Response.json({ summary });
  } catch (error) {
    if (isVectorInfrastructureError(error)) {
      return Response.json({
        summary: "",
        degraded: true,
        hint: "ChromaDB is not reachable. Start it on port 8000 or set CHROMA_URL in .env.local (see README)."
      });
    }
    if (isMissingEnvError(error)) {
      return Response.json({
        summary: "",
        degraded: true,
        hint: error?.message || "Configure API keys in .env.local."
      });
    }
    return Response.json(
      { error: error?.message || "Summary generation failed" },
      { status: 500 }
    );
  }
}
