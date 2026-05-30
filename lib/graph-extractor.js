import Anthropic from "@anthropic-ai/sdk";
import { runQuery } from "@/lib/graphdb";

const EXTRACTION_MODEL = "claude-haiku-4-5-20251001";

const ALLOWED_REL_TYPES = new Set([
  "HAS_REVENUE",
  "HAS_DEBT",
  "HAS_MARGIN",
  "REPORTED_IN",
  "LEADS",
  "ACQUIRED",
  "COMPARED_TO",
  "INCREASED_TO",
  "DECREASED_TO"
]);

const EXTRACTION_PROMPT = `You are a financial entity extractor. Extract entities and relationships from financial text.

Return ONLY valid JSON (no markdown fences, no commentary) in this shape:
{"entities":[{"id":"snake_case_id","type":"Company","name":"Tesla","value":"25.2","unit":"USD"}],"relationships":[{"from":"entity_id","to":"entity_id","type":"HAS_REVENUE"}]}

Rules:
- Extract only clearly stated facts — do not invent
- type must be one of: Company, Metric, Period, Person, Division, Transaction
- relationship type must be one of: HAS_REVENUE, HAS_DEBT, HAS_MARGIN, REPORTED_IN, LEADS, ACQUIRED, COMPARED_TO, INCREASED_TO, DECREASED_TO
- id must be unique snake_case per chunk
- Max 8 entities and 6 relationships per response
- Use null for value/unit when not applicable
- If nothing clear exists, return {"entities":[],"relationships":[]}`;

const COMPACT_PROMPT = `Extract up to 5 financial entities from the text. Return ONLY compact valid JSON:
{"entities":[{"id":"company_name","type":"Company","name":"Name","value":null,"unit":null}],"relationships":[]}
No markdown. No explanation.`;

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is missing");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function sanitizeId(id) {
  return String(id || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function parseJsonFromLlm(raw) {
  if (!raw?.trim()) throw new Error("Empty LLM response");

  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object in response");
  text = text.slice(start);

  const attempts = [
    () => JSON.parse(text),
    () => {
      let depth = 0;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") {
          depth--;
          if (depth === 0) return JSON.parse(text.slice(0, i + 1));
        }
      }
      throw new Error("Unbalanced JSON braces");
    },
    () => {
      let repaired = text.replace(/,\s*([}\]])/g, "$1");
      const openBraces = (repaired.match(/{/g) || []).length;
      const closeBraces = (repaired.match(/}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/]/g) || []).length;
      for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";
      for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";
      return JSON.parse(repaired);
    }
  ];

  let lastError;
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("JSON parse failed");
}

function validateExtraction(parsed) {
  const entities = Array.isArray(parsed?.entities) ? parsed.entities : [];
  const relationships = Array.isArray(parsed?.relationships) ? parsed.relationships : [];

  const normalizedEntities = entities
    .filter((e) => e && e.id && e.name && e.type)
    .slice(0, 12)
    .map((e) => ({
      id: sanitizeId(e.id),
      type: String(e.type).trim(),
      name: String(e.name).trim().slice(0, 200),
      value: e.value != null && e.value !== "" ? String(e.value) : null,
      unit: e.unit != null && e.unit !== "" ? String(e.unit) : null
    }))
    .filter((e) => e.id);

  const entityIds = new Set(normalizedEntities.map((e) => e.id));

  const normalizedRelationships = relationships
    .filter((r) => r && r.from && r.to && r.type)
    .map((r) => ({
      from: sanitizeId(r.from),
      to: sanitizeId(r.to),
      type: String(r.type).trim().toUpperCase()
    }))
    .filter(
      (r) =>
        ALLOWED_REL_TYPES.has(r.type) &&
        entityIds.has(r.from) &&
        entityIds.has(r.to)
    )
    .slice(0, 10);

  return { entities: normalizedEntities, relationships: normalizedRelationships };
}

async function callExtraction(text, documentName, compact = false) {
  const client = getClient();
  const response = await client.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: compact ? 800 : 1500,
    system: compact ? COMPACT_PROMPT : EXTRACTION_PROMPT,
    messages: [
      {
        role: "user",
        content: `Document: ${documentName}\n\nText:\n${text.slice(0, 2500)}\n\nExtract financial entities and relationships as JSON only.`
      }
    ]
  });

  const raw = response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();

  return validateExtraction(parseJsonFromLlm(raw));
}

export async function extractEntities(text, documentName) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await callExtraction(text, documentName, attempt === 1);
    } catch (err) {
      if (attempt === 0) continue;
      console.error("Entity extraction failed:", err.message);
      return { entities: [], relationships: [] };
    }
  }
  return { entities: [], relationships: [] };
}

export async function storeInGraph(extracted, documentName, chunkIndex) {
  if (!extracted.entities?.length) return 0;

  let stored = 0;

  try {
    for (const entity of extracted.entities) {
      await runQuery(
        `MERGE (e:Entity {id: $id})
         SET e.type = $type,
             e.name = $name,
             e.value = $value,
             e.unit = $unit,
             e.document = $document,
             e.chunkIndex = $chunkIndex`,
        {
          id: `${documentName}_${entity.id}`,
          type: entity.type,
          name: entity.name,
          value: entity.value || null,
          unit: entity.unit || null,
          document: documentName,
          chunkIndex: chunkIndex
        }
      );
      stored++;
    }

    for (const rel of extracted.relationships || []) {
      if (!ALLOWED_REL_TYPES.has(rel.type)) continue;
      await runQuery(
        `MATCH (a:Entity {id: $fromId})
         MATCH (b:Entity {id: $toId})
         MERGE (a)-[r:${rel.type}]->(b)
         SET r.document = $document`,
        {
          fromId: `${documentName}_${rel.from}`,
          toId: `${documentName}_${rel.to}`,
          document: documentName
        }
      );
    }
  } catch (err) {
    console.error("Graph storage failed:", err.message);
  }

  return stored;
}

export async function extractAndStore(chunks, documentName) {
  console.log(`Extracting entities from ${chunks.length} chunks...`);

  const chunksToProcess = chunks.filter((_, i) => i % 2 === 0);
  let totalEntities = 0;
  let totalRelationships = 0;
  let successfulChunks = 0;

  for (let i = 0; i < chunksToProcess.length; i++) {
    const chunk = chunksToProcess[i];
    const extracted = await extractEntities(chunk.text, documentName);
    const stored = await storeInGraph(extracted, documentName, i);
    if (stored > 0) successfulChunks++;
    totalEntities += extracted.entities.length;
    totalRelationships += extracted.relationships.length;
  }

  console.log(
    `Graph extraction complete for ${documentName}: ${totalEntities} entities, ${totalRelationships} relationships (${successfulChunks}/${chunksToProcess.length} chunks stored)`
  );
}

export async function deleteDocumentFromGraph(documentName) {
  try {
    await runQuery(
      `MATCH (e:Entity {document: $document})
       DETACH DELETE e`,
      { document: documentName }
    );
  } catch (err) {
    console.error("Graph deletion failed:", err.message);
  }
}
