"use client";

const ACCENT = "#00D4FF";
const ACCENT2 = "#6366F1";
const GRID = "rgba(255,255,255,0.03)";
const LABEL = "rgba(255,255,255,0.25)";
const VALUETIP = "rgba(255,255,255,0.70)";

function formatTick(n) {
  if (n == null || !Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function shortLabel(s, max = 14) {
  const t = String(s || "");
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function scaleY(values, innerH, padT, forceZero = false) {
  let vmin = forceZero && values.every((v) => v >= 0) ? 0 : Math.min(...values);
  let vmax = Math.max(...values);
  if (!Number.isFinite(vmin) || !Number.isFinite(vmax)) return () => padT + innerH;
  if (vmin === vmax) {
    if (!forceZero) vmin -= Math.abs(vmax) * 0.05 || 1;
    vmax += Math.abs(vmax) * 0.05 || 1;
  }
  const range = vmax - vmin;
  return (v) => padT + innerH - ((v - vmin) / range) * innerH;
}

function SvgBarChart({ points, chartIdx }) {
  const W = 460;
  const H = 260;
  const padL = 56;
  const padR = 16;
  const padT = 20;
  const padB = 56;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const values = points.map((p) => p.value);
  const allPositive = values.every((v) => v >= 0);
  const yToPx = scaleY(values, innerH, padT, true);
  const n = points.length;
  const slot = innerW / n;
  const barW = Math.min(Math.max(12, slot * 0.5), 48);

  const ticks = 4;
  const vmin = allPositive ? 0 : Math.min(...values);
  const vmax = Math.max(...values);
  const vspan = vmax === vmin ? Math.abs(vmax) || 1 : vmax - vmin;

  const BAR_COLORS = ["#5B8DB8", "#4CAF82", "#E07B54", "#9B7FD4", "#C9A84C"];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const t = i / ticks;
        const yv = vmin + (1 - t) * vspan;
        const y = padT + t * innerH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={GRID} />
            <text x={padL - 8} y={y + 4} textAnchor="end" fill={LABEL} fontSize="10" fontFamily="var(--font-inter), system-ui, sans-serif">
              {formatTick(yv)}
            </text>
          </g>
        );
      })}
      <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke="rgba(255,255,255,0.06)" />
      {points.map((p, i) => {
        const cx = padL + slot * i + slot / 2;
        const top = yToPx(p.value);
        const base = padT + innerH;
        const h = Math.max(base - top, 2);
        const y = base - h;
        const x = cx - barW / 2;
        const fill = BAR_COLORS[i % BAR_COLORS.length];
        return (
          <g key={`${p.name}-${i}`}>
            <rect x={x} y={y} width={barW} height={h} fill={fill} rx={5}>
              <title>{`${p.name}: ${formatTick(p.value)}`}</title>
            </rect>
            <text x={cx} y={y - 6} textAnchor="middle" fill={VALUETIP} fontSize="9" fontWeight="500" fontFamily="var(--font-inter), system-ui, sans-serif">
              {formatTick(p.value)}
            </text>
            <text x={cx} y={H - 14} textAnchor="middle" fill={LABEL} fontSize="9" fontFamily="var(--font-inter), system-ui, sans-serif"
              transform={n > 5 ? `rotate(-28 ${cx} ${H - 14})` : undefined}
            >
              {shortLabel(p.name, n > 5 ? 10 : 16)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SvgLineChart({ points, chartIdx }) {
  const W = 460;
  const H = 260;
  const padL = 56;
  const padR = 16;
  const padT = 20;
  const padB = 56;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const values = points.map((p) => p.value);
  const yToPx = scaleY(values, innerH, padT);
  const n = points.length;
  const dx = n > 1 ? innerW / (n - 1) : 0;

  const pts = points.map((p, i) => {
    const x = padL + (n === 1 ? innerW / 2 : i * dx);
    const y = yToPx(p.value);
    return { x, y, p };
  });

  const d = pts.map((o, i) => `${i === 0 ? "M" : "L"} ${o.x} ${o.y}`).join(" ");
  const areaD = `${d} L${pts[pts.length - 1].x} ${padT + innerH} L${pts[0].x} ${padT + innerH} Z`;

  const vmin = Math.min(...values);
  const vmax = Math.max(...values);
  const vspan = vmax === vmin ? Math.abs(vmax) || 1 : vmax - vmin;
  const ticks = 4;

  const areaGradId = `lineArea-${chartIdx}`;
  const lineGlowId = `lineGlow-${chartIdx}`;
  const dotGlowId = `dotGlow-${chartIdx}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={areaGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.20" />
          <stop offset="50%" stopColor={ACCENT} stopOpacity="0.06" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
        <filter id={lineGlowId}>
          <feGaussianBlur stdDeviation="2.5" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={dotGlowId}>
          <feGaussianBlur stdDeviation="4" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const t = i / ticks;
        const yv = vmin + (1 - t) * vspan;
        const y = padT + t * innerH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke={GRID} />
            <text x={padL - 8} y={y + 4} textAnchor="end" fill={LABEL} fontSize="10" fontFamily="var(--font-inter), system-ui, sans-serif">
              {formatTick(yv)}
            </text>
          </g>
        );
      })}
      <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke="rgba(255,255,255,0.06)" />
      <path d={areaD} fill={`url(#${areaGradId})`} />
      <path d={d} fill="none" stroke={ACCENT} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${lineGlowId})`} />
      {pts.map((o, i) => (
        <g key={i}>
          <circle cx={o.x} cy={o.y} r={5} fill={ACCENT} opacity="0.15" filter={`url(#${dotGlowId})`} />
          <circle cx={o.x} cy={o.y} r={3.5} fill="#0D0D0F" stroke={ACCENT} strokeWidth={2}>
            <title>{`${o.p.name}: ${formatTick(o.p.value)}`}</title>
          </circle>
          <text x={o.x} y={o.y - 10} textAnchor="middle" fill={VALUETIP} fontSize="9" fontWeight="500" fontFamily="var(--font-inter), system-ui, sans-serif">
            {formatTick(o.p.value)}
          </text>
          <text x={o.x} y={H - 14} textAnchor="middle" fill={LABEL} fontSize="9" fontFamily="var(--font-inter), system-ui, sans-serif"
            transform={n > 5 ? `rotate(-28 ${o.x} ${H - 14})` : undefined}
          >
            {shortLabel(o.p.name, n > 5 ? 10 : 16)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function FinancialCharts({ charts = [], loading, hint }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/[0.04] bg-[#0D0D0F] px-4 py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
          <p className="text-xs text-white/25">Building charts...</p>
        </div>
      </div>
    );
  }

  const hintText = typeof hint === "string" ? hint : hint != null ? String(hint) : "";

  if (hintText && !charts.length) {
    return (
      <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.03] px-5 py-4 text-[11px] leading-relaxed text-amber-200/60">
        {hintText}
      </div>
    );
  }

  if (!charts.length) {
    return null;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {charts.map((chart, idx) => (
        <div
          key={`${chart.title}-${idx}`}
          className="group overflow-hidden rounded-2xl border border-white/[0.04] bg-[#0D0D0F] p-5 transition-colors duration-300 hover:border-white/[0.08]"
        >
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-sm font-medium text-white/75">{chart.title}</h4>
            {chart.unit && (
              <span className="rounded-md bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/20">
                {chart.unit}
              </span>
            )}
          </div>
          <div className="h-[260px] w-full min-w-0 overflow-hidden">
            {chart.type === "line" ? (
              <SvgLineChart points={chart.points} chartIdx={idx} />
            ) : (
              <SvgBarChart points={chart.points} chartIdx={idx} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
