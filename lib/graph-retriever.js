import Anthropic from "@anthropic-ai/sdk";
import { runQuery } from "@/lib/graphdb";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CYPHER_PROMPT = `You are a Neo4j Cypher query generator for financial data.

The graph has:
- Nodes: Entity with properties (id, type, name, value, unit, document)
- Entity types: Company, Metric, Period, Person, Division, Transaction
- Relationships: HAS_REVENUE, HAS_DEBT, HAS_MARGIN, REPORTED_IN, LEADS, ACQUIRED, COMPARED_TO, INCREASED_TO, DECREASED_TO

Generate a Cypher query to answer the user question.
Return ONLY the Cypher query — no explanation, no markdown.

Rules:
- Always LIMIT results to 10
- Use case-insensitive matching: toLower(e.name) CONTAINS toLower($keyword)
- Return entity name, value, unit, document, and relationship type
- If question is too vague, return: MATCH (e:Entity) RETURN e.name, e.value, e.unit, e.document LIMIT 10`;

async function generateCypherQuery(question) {
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Question: ${question}\n\nGenerate a Cypher query to find relevant financial entities.`
        }
      ],
      system: CYPHER_PROMPT
    });

    return response.content[0].text.trim();
  } catch {
    return null;
  }
}

function recordsToChunks(records, question) {
  if (!records?.length) return [];

  const text = records
    .map((r) => {
      const fields = r.keys.map((k) => `${k}: ${r.get(k) ?? "N/A"}`).join(", ");
      return fields;
    })
    .join("\n");

  return [
    {
      text: `Graph Knowledge (from Neo4j):\n${text}`,
      metadata: { fileName: "Knowledge Graph", page: null },
      distance: 0.1,
      source: "graph"
    }
  ];
}

export async function queryGraph(question) {
  try {
    const cypher = await generateCypherQuery(question);
    if (!cypher) return [];

    const records = await runQuery(cypher);
    return recordsToChunks(records, question);
  } catch (err) {
    console.error("Graph retrieval failed:", err.message);
    return [];
  }
}