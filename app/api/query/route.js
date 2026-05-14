import { isMissingEnvError, isVectorInfrastructureError } from "@/lib/infrastructure-errors";
import { queryRAG, queryRAGCompare } from "@/lib/rag";
import { getDocumentsByFilename } from "@/lib/vectordb";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();
    const { question, imageBase64 } = body;
    if (!question?.trim()) {
      return Response.json({ error: "Question is required" }, { status: 400 });
    }

    let rawNames = [];
    if (Array.isArray(body.compareDocumentNames)) {
      rawNames = [...new Set(body.compareDocumentNames.map((x) => String(x ?? "").trim()).filter(Boolean))].slice(
        0,
        3
      );
    }

    if (rawNames.length >= 2) {
      for (const name of rawNames) {
        const rows = await getDocumentsByFilename(name, 1);
        if (!rows.length) {
          return Response.json(
            { error: "Document not indexed — please re-upload" },
            { status: 400 }
          );
        }
      }
    }

    let stream;
    let citations;
    // Compare mode: Chroma is queried per selected filename; see queryRAGCompare in lib/rag.js.
    if (rawNames.length >= 2) {
      ({ stream, citations } = await queryRAGCompare(question.trim(), rawNames, imageBase64));
    } else if (rawNames.length === 1) {
      return Response.json(
        { error: "Compare mode requires at least two selected documents." },
        { status: 400 }
      );
    } else {
      ({ stream, citations } = await queryRAG(question.trim(), imageBase64));
    }

    const encoder = new TextEncoder();
    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "token", token: event.delta.text })}\n\n`)
              );
            }
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done", citations })}\n\n`)
          );
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Streaming failed" })}\n\n`)
          );
          controller.close();
        }
      }
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    if (isVectorInfrastructureError(error)) {
      return Response.json(
        {
          error:
            "ChromaDB is not reachable. Start the vector database or check CHROMA_URL.",
          code: "VECTOR_DB_UNAVAILABLE"
        },
        { status: 503 }
      );
    }
    if (isMissingEnvError(error)) {
      return Response.json(
        { error: error?.message || "Missing API configuration.", code: "MISSING_CONFIGURATION" },
        { status: 503 }
      );
    }
    return Response.json(
      { error: error?.message || "Query failed" },
      { status: 500 }
    );
  }
}
