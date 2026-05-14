import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { isMissingEnvError, isVectorInfrastructureError } from "@/lib/infrastructure-errors";
import { indexDocument } from "@/lib/rag";
import { deleteDocumentsByFilename } from "@/lib/vectordb";

export const runtime = "nodejs";

export async function DELETE(req) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON body with filename is required." }, { status: 400 });
    }
    const filename = typeof body.filename === "string" ? body.filename.trim() : "";
    if (!filename) {
      return Response.json({ error: "filename is required" }, { status: 400 });
    }

    await deleteDocumentsByFilename(filename);
    return Response.json({ success: true });
  } catch (error) {
    if (isVectorInfrastructureError(error)) {
      return Response.json(
        {
          success: false,
          code: "VECTOR_DB_UNAVAILABLE",
          error:
            "Cannot reach ChromaDB. Start it on port 8000 or set CHROMA_URL in .env.local."
        },
        { status: 503 }
      );
    }
    return Response.json(
      { success: false, error: error?.message || "Delete failed" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files");

    if (!files.length) {
      return Response.json({ error: "No files uploaded" }, { status: 400 });
    }

    const uploaded = [];

    for (const file of files) {
      if (typeof file !== "object" || file == null || typeof file.arrayBuffer !== "function") {
        return Response.json(
          {
            success: false,
            error: 'Invalid upload payload (expected file Blob parts named "files").'
          },
          { status: 400 }
        );
      }

      const displayName = path.basename(
        typeof file.name === "string" && file.name ? file.name : "document.bin"
      ) || "document.bin";
      const buffer = Buffer.from(await file.arrayBuffer());
      const tempFilePath = path.join(os.tmpdir(), `${crypto.randomUUID()}-${displayName}`);

      await fs.promises.writeFile(tempFilePath, buffer);

      try {
        const chunks = await indexDocument(tempFilePath, displayName);
        uploaded.push({
          id: crypto.randomUUID(),
          name: displayName,
          type: file.type || "application/octet-stream",
          chunks: chunks.length
        });
      } catch (error) {
        let userMsg = error?.message ? String(error.message) : "Indexing failed";
        if (isVectorInfrastructureError(error)) {
          userMsg =
            "ChromaDB is not reachable. Start Chroma (e.g. Docker on port 8000) or set CHROMA_URL in .env.local.";
        } else if (isMissingEnvError(error)) {
          userMsg =
            error?.message ||
            "Missing OPENAI_API_KEY (or another required key). Add it to .env.local and restart Next.js.";
        }
        uploaded.push({
          id: crypto.randomUUID(),
          name: displayName,
          type: file.type || "application/octet-stream",
          chunks: 0,
          indexError: userMsg
        });
      } finally {
        await fs.promises.unlink(tempFilePath).catch(() => {});
      }
    }

    const anyIndexError = uploaded.some((f) => f.indexError);
    return Response.json({
      success: true,
      files: uploaded,
      ...(anyIndexError && {
        hint: "File(s) appear below but indexing failed for at least one. Fix Chroma + OPENAI_API_KEY, restart the app, then upload again to index."
      })
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error?.message || "Upload processing failed" },
      { status: 500 }
    );
  }
}
