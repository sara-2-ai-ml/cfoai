"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { GitBranch, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
const TYPE_COLORS = {
  Company: "#60a5fa",
  Metric: "#34d399",
  Period: "#f59e0b",
  Person: "#a78bfa",
  Division: "#fb7185",
  Transaction: "#22d3ee",
  default: "#94a3b8"
};

const REL_LABELS = {
  HAS_REVENUE: "revenue",
  HAS_DEBT: "debt",
  HAS_MARGIN: "margin",
  REPORTED_IN: "reported in",
  LEADS: "leads",
  ACQUIRED: "acquired",
  COMPARED_TO: "vs",
  INCREASED_TO: "increased to",
  DECREASED_TO: "decreased to"
};

export default function KnowledgeGraph() {
  const svgRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ nodes: 0, links: 0 });
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const res = await fetch("/api/graph");
      const data = await res.json();

      if (!data.nodes?.length) {
        setError("No graph data yet — upload a document first.");
        setStats({ nodes: 0, links: 0 });
        setLoading(false);
        return;
      }

      setStats({ nodes: data.nodes.length, links: data.links.length });
      renderGraph(data.nodes, data.links);
    } catch {
      setError("Could not load graph data.");
      setStats({ nodes: 0, links: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph();
  }, [loadGraph, refreshKey]);
  function renderGraph(nodes, links) {
    const container = svgRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = 520;

    d3.select(container).selectAll("*").remove();

    const svg = d3.select(container)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", height)
      .style("background", "#09090B")
      .style("border-radius", "12px");

    // Zoom
    const g = svg.append("g");
    svg.call(
      d3.zoom()
        .scaleExtent([0.2, 3])
        .on("zoom", (e) => g.attr("transform", e.transform))
    );

    // Arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "rgba(255,255,255,0.2)");

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(40));

    // Links
    const link = g.append("g").selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "rgba(255,255,255,0.15)")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)");

    // Link labels
    const linkLabel = g.append("g").selectAll("text")
      .data(links)
      .join("text")
      .attr("fill", "rgba(255,255,255,0.3)")
      .attr("font-size", 9)
      .attr("text-anchor", "middle")
      .text((d) => REL_LABELS[d.relationship] || d.relationship);

    // Nodes
    const node = g.append("g").selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .call(
        d3.drag()
          .on("start", (e, d) => {
            if (!e.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on("end", (e, d) => {
            if (!e.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      )
      .on("click", (e, d) => {
        e.stopPropagation();
        setSelected(d);
      });

    node.append("circle")
      .attr("r", (d) => d.type === "Company" ? 18 : 12)
      .attr("fill", (d) => TYPE_COLORS[d.type] || TYPE_COLORS.default)
      .attr("fill-opacity", 0.85)
      .attr("stroke", (d) => TYPE_COLORS[d.type] || TYPE_COLORS.default)
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.4);

    node.append("text")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", (d) => d.type === "Company" ? 9 : 8)
      .attr("font-weight", 500)
      .attr("pointer-events", "none")
      .text((d) => d.name?.slice(0, 10) || "");

    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      linkLabel
        .attr("x", (d) => (d.source.x + d.target.x) / 2)
        .attr("y", (d) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    svg.on("click", () => setSelected(null));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5 text-white/30" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/30">
              Knowledge Graph
            </span>
          </div>
          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-white/40">
            Entities and relationships extracted from uploaded reports. Click a node for details; scroll to zoom, drag to rearrange.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!loading && !error && stats.nodes > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/45">
              <span>{stats.nodes} nodes</span>
              <span className="text-white/20">·</span>
              <span>{stats.links} links</span>
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() => setRefreshKey((k) => k + 1)}
            className="h-8 gap-1.5 border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white/80"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      {/* Legend */}
      {!error && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Legend</span>
          {Object.entries(TYPE_COLORS)
            .filter(([k]) => k !== "default")
            .map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full ring-1 ring-white/10"
                  style={{ background: color }}
                />
                <span className="text-[11px] text-white/50">{type}</span>
              </div>
            ))}
        </div>
      )}
      {/* Graph */}
      <div className="relative rounded-xl border border-white/[0.06] overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#09090B] z-10">
            <p className="text-sm text-white/40">Loading graph...</p>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-64 bg-[#09090B] rounded-xl">
            <p className="text-sm text-white/40">{error}</p>
          </div>
        )}
        <svg ref={svgRef} className="w-full" />
      </div>

      {/* Selected node info */}
      {selected && (
        <div className="rounded-xl border border-white/[0.06] bg-card px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ background: TYPE_COLORS[selected.type] || TYPE_COLORS.default }}
            />
            <span className="text-xs font-semibold text-white/70">{selected.type}</span>
          </div>
          <p className="text-sm font-medium text-white">{selected.name}</p>
          {selected.value && (
            <p className="text-xs text-white/40 mt-1">
              Value: {selected.value} {selected.unit || ""}
            </p>
          )}
          {selected.document && (
            <p className="text-xs text-white/30 mt-0.5">Source: {selected.document}</p>
          )}
        </div>
      )}
    </div>
  );
}