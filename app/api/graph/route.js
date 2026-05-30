import { runQuery } from "@/lib/graphdb";

export const runtime = "nodejs";

export async function GET() {
  try {
    const records = await runQuery(
      `MATCH (a:Entity)-[r]->(b:Entity)
       RETURN 
         a.id AS fromId, a.name AS fromName, a.type AS fromType, a.value AS fromValue, a.unit AS fromUnit,
         b.id AS toId, b.name AS toName, b.type AS toType, b.value AS toValue, b.unit AS toUnit,
         type(r) AS relationship, a.document AS document
       LIMIT 200`
    );

    const nodesMap = new Map();
    const links = [];

    for (const record of records) {
      const fromId = record.get("fromId");
      const toId = record.get("toId");

      if (!nodesMap.has(fromId)) {
        nodesMap.set(fromId, {
          id: fromId,
          name: record.get("fromName"),
          type: record.get("fromType"),
          value: record.get("fromValue"),
          unit: record.get("fromUnit"),
          document: record.get("document")
        });
      }

      if (!nodesMap.has(toId)) {
        nodesMap.set(toId, {
          id: toId,
          name: record.get("toName"),
          type: record.get("toType"),
          value: record.get("toValue"),
          unit: record.get("toUnit"),
          document: record.get("document")
        });
      }

      links.push({
        source: fromId,
        target: toId,
        relationship: record.get("relationship")
      });
    }

    return Response.json({
      nodes: [...nodesMap.values()],
      links
    });
  } catch (err) {
    return Response.json({ nodes: [], links: [], error: err.message }, { status: 500 });
  }
}