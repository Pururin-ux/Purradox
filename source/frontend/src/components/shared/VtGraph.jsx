const TH = {
  study: { grid: "var(--plot-grid, #e8dedd)", axis: "var(--plot-axis, #8b737b)", line: "var(--plot-line, #913d59)", fill: "var(--plot-fill, #eed6dc)", label: "var(--plot-label, #7b646c)", font: "'Onest', sans-serif", fs: 18 },
  a: { grid: "rgba(255,255,255,.07)", axis: "rgba(241,245,249,.55)", line: "#00E5FF", fill: "rgba(255,184,48,.22)", label: "#94A3B8", font: "'JetBrains Mono', monospace", fs: 11 },
  b: { grid: "#E3E0D8", axis: "#1F2421", line: "#1F2421", fill: "rgba(0,168,204,.22)", label: "#5C6560", font: "'Caveat', cursive", fs: 17 },
  bct: { grid: "rgba(230,57,70,.14)", axis: "#FFF1F2", line: "#E63946", fill: "rgba(230,57,70,.22)", label: "#F4A5AC", font: "'JetBrains Mono', monospace", fs: 11 },
};

export function VtGraph({ graph, theme = "a", className = "", compact = false }) {
  const th = TH[theme];
  const { points, tmax, vmax, tstep = 1, vstep = 2, fill_from: fillFrom = 0, fill_to: fillTo,
    xLabel = "t, с", yLabel = "υₓ, м/с", alt } = graph;
  const L = compact ? 40 : 46;
  const R = compact ? 267 : 318;
  const Tp = compact ? 34 : 22;
  const B = compact ? 170 : 206;
  const fontSize = compact ? 19 : th.fs;
  const X = (t) => L + (t / tmax) * (R - L);
  const Y = (v) => B - (v / vmax) * (B - Tp);
  const [p0, p1] = points;
  const graphLabel = alt ?? (compact
    ? `Проекция скорости от времени. Прямая от точки (${p0[0]} с, ${p0[1]} м/с) до точки (${p1[0]} с, ${p1[1]} м/с).`
    : "График зависимости проекции скорости от времени");
  const vAt = (t) => p0[1] + ((p1[1] - p0[1]) * (t - p0[0])) / (p1[0] - p0[0]);
  const ts = [];
  for (let t = 0; t <= tmax; t += tstep) ts.push(t);
  const vs = [];
  for (let v = 0; v <= vmax; v += vstep) vs.push(v);
  return (
    <svg viewBox={compact ? "0 0 288 222" : "0 0 370 240"} className={`w-full max-w-[420px] ${className}`} role="img" aria-label={graphLabel} data-testid="vt-graph">
      {ts.map((t) => (
        <g key={`t${t}`}>
          <line x1={X(t)} y1={Y(0)} x2={X(t)} y2={Y(vmax)} stroke={th.grid} />
          <text x={X(t)} y={B + (compact ? 23 : 18)} textAnchor="middle" fill={th.label} fontFamily={th.font} fontSize={fontSize}>{t}</text>
        </g>
      ))}
      {vs.map((v) => (
        <g key={`v${v}`}>
          <line x1={X(0)} y1={Y(v)} x2={X(tmax)} y2={Y(v)} stroke={th.grid} />
          <text x={L - 8} y={Y(v) + 4} textAnchor="end" fill={th.label} fontFamily={th.font} fontSize={fontSize}>{v}</text>
        </g>
      ))}
      {Number.isFinite(fillTo) && fillTo > fillFrom && (
        <path d={`M${X(fillFrom)},${Y(0)} L${X(fillFrom)},${Y(vAt(fillFrom))} L${X(fillTo)},${Y(vAt(fillTo))} L${X(fillTo)},${Y(0)} Z`} fill={th.fill} />
      )}
      <line x1={X(p0[0])} y1={Y(p0[1])} x2={X(p1[0])} y2={Y(p1[1])} stroke={th.line} strokeWidth="2.6" strokeLinecap="round" />
      <line x1={X(0)} y1={Y(0)} x2={R + 14} y2={Y(0)} stroke={th.axis} strokeWidth="1.4" />
      <line x1={X(0)} y1={Y(0)} x2={X(0)} y2={Tp - 10} stroke={th.axis} strokeWidth="1.4" />
      <text x={compact ? R : R + 16} y={compact ? B + 46 : Y(0) + 4} textAnchor={compact ? "end" : undefined}
        fill={th.label} fontFamily={th.font} fontSize={fontSize}>{xLabel}</text>
      <text x={X(0) + 8} y={compact ? 20 : Tp - 6} fill={th.label} fontFamily={th.font} fontSize={fontSize}>{yLabel}</text>
    </svg>
  );
}
