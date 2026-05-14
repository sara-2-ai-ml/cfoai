import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import sharp from "sharp";
import pdfParse from "pdf-parse";
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is missing");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function chunkText(text, chunkSize = 1500, overlap = 200) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks = [];
  const step = chunkSize - overlap;
  for (let i = 0; i < clean.length; i += step) {
    chunks.push(clean.slice(i, i + chunkSize));
    if (i + chunkSize >= clean.length) break;
  }
  return chunks;
}

async function processPdf(fileBuffer) {
  const parsed = await pdfParse(fileBuffer);
  return chunkText(parsed.text).map((text, idx) => ({
    text,
    page: idx + 1
  }));
}

function processExcel(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const rows = [];
  for (const sheetName of workbook.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
    rows.push(`[Sheet: ${sheetName}]\n${csv}`);
  }
  return chunkText(rows.join("\n")).map((text) => ({ text }));
}

function processCsv(fileBuffer) {
  const text = fileBuffer.toString("utf8");
  return chunkText(text).map((chunk) => ({ text: chunk }));
}

async function processImage(fileBuffer) {
  const resized = await sharp(fileBuffer)
    .resize({ width: 1800, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const base64Data = resized.toString("base64");
  
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1000,
    system: "You are an expert financial analyst. Analyze the provided image of a financial chart or table and extract a detailed description of the data, trends, and key insights. Be factual and comprehensive.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64Data,
            },
          },
          {
            type: "text",
            text: "Extract all financial data and describe the insights shown in this image."
          }
        ]
      }
    ]
  });

  const description = response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");

  return [
    {
      text: `[Extracted from Image]\n${description}`,
      image: base64Data
    }
  ];
}

export async function processFile(filePath) {
  const buffer = await fs.promises.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase().replace(".", "");

  if (ext === "pdf") return processPdf(buffer);
  if (ext === "xls" || ext === "xlsx") return processExcel(buffer);
  if (ext === "csv") return processCsv(buffer);
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return processImage(buffer);

  return [];
}
