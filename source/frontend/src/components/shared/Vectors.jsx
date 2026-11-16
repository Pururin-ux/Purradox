const TH = {
  study: { v:"#913d59", a:"#946e41", text:"#4b343d", font:"'Onest', sans-serif", fs:17, body:"#fffaf6", stroke:"#b78b9b" },
  a: { v: "#00E5FF", a: "#FFB830", text: "#F1F5F9", font: "'Unbounded', sans-serif", fs: 13, body: "rgba(255,255,255,.12)", stroke: "rgba(255,255,255,.4)" },
  b: { v: "#1F2421", a: "#00A8CC", text: "#1F2421", font: "'Caveat', cursive", fs: 20, body: "#FFFEFA", stroke: "#1F2421" },
};

function Arrow({ x1, x2, y, color, label, th }) {
  const dir = x2 > x1 ? 1 : -1;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2 - dir * 8} y2={y} stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path d={`M${x2},${y} L${x2 - dir * 12},${y - 7} L${x2 - dir * 12},${y + 7} Z`} fill={color} />
      <text x={(x1 + x2) / 2} y={y - 10} textAnchor="middle" fill={color} fontFamily={th.font} fontSize={th.fs} fontWeight="700">{label}</text>
    </g>
  );
}

function Row({ y, title, brake, th }) {
  return (
    <g>
      <text x="0" y={y + 5} fill={th.text} fontFamily={th.font} fontSize={th.fs}>{title}</text>
      <rect x="128" y={y - 13} width="34" height="26" rx="6" fill={th.body} stroke={th.stroke} strokeWidth="1.5" />
      <Arrow x1={172} x2={262} y={y - 2} color={th.v} label="υ" th={th} />
      {brake ? (
        <Arrow x1={262} x2={182} y={y + 26} color={th.a} label="a" th={th} />
      ) : (
        <Arrow x1={172} x2={232} y={y + 26} color={th.a} label="a" th={th} />
      )}
    </g>
  );
}

export function Vectors({ theme = "a" }) {
  const th = TH[theme];
  return (
    <svg viewBox="0 0 300 150" className="w-full max-w-[360px]" role="img" aria-label="Направления скорости и ускорения при разгоне и торможении" data-testid="vectors-diagram">
      <Row y={30} title="разгон" th={th} />
      <Row y={104} title="торможение" brake th={th} />
    </svg>
  );
}
