/**
 * Normalize & validate chart JSON from the /api/charts model output.
 */

function toPoint(row) {
  if (!row || typeof row !== "object") return null;
  const name = String(row.name ?? row.label ?? row.category ?? "").trim();
  const raw = row.value ?? row.amount ?? row.y;
  const value = typeof raw === "number" ? raw : Number.parseFloat(String(raw).replace(/,/g, ""));
  if (!name || !Number.isFinite(value)) return null;
  return { name: name.slice(0, 64), value };
}

export function normalizeChartPayload(raw) {
  if (!raw || typeof raw !== "object") return { charts: [] };
  const list = Array.isArray(raw.charts) ? raw.charts : [];
  const charts = [];

  for (const c of list.slice(0, 3)) {
    const type = c.type === "line" ? "line" : "bar";
    const title = String(c.title || "Metrics").slice(0, 140);
    const rows = Array.isArray(c.points)
      ? c.points
      : Array.isArray(c.series)
        ? c.series
        : Array.isArray(c.data)
          ? c.data
          : [];
    const points = rows.map(toPoint).filter(Boolean);
    if (points.length < 2) continue;
    const unit = typeof c.unit === "string" ? c.unit.slice(0, 40) : "";
    charts.push({ type, title, unit, points });
  }

  return { charts };
}
