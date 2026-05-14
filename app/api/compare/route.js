import { isMissingEnvError, isVectorInfrastructureError } from "@/lib/infrastructure-errors";
import { generateMultiDocumentComparison } from "@/lib/rag";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Request body must be JSON with a filenames array (2–3 items)." },
        { status: 400 }
      );
    }
    const raw = body.filenames;
    if (!Array.isArray(raw)) {
      return Response.json({ error: "filenames must be an array of strings." }, { status: 400 });
    }
    const filenames = raw.map((f) => String(f ?? "").trim()).filter(Boolean);
    if (filenames.length < 2) {
      return Response.json(
        { error: "Pick at least two uploaded documents to compare (up to three)." },
        { status: 400 }
      );
    }

    const comparison = await generateMultiDocumentComparison(filenames);
    return Response.json({ comparison });
  } catch (error) {
    const msg = error?.message || "Comparison failed";
    if (msg.includes("Select at least two")) {
      return Response.json({ error: msg }, { status: 400 });
    }
    if (isVectorInfrastructureError(error)) {
      return Response.json({
        comparison: "",
        degraded: true,
        hint: "ChromaDB is not reachable. Start it on port 8000 or set CHROMA_URL in .env.local."
      });
    }
    if (isMissingEnvError(error)) {
      return Response.json({
        comparison: "",
        degraded: true,
        hint: error?.message || "Configure API keys in .env.local."
      });
    }
    return Response.json({ error: msg }, { status: 500 });
  }
}
