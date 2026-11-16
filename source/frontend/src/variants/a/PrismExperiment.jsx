import { useId, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { prismAngles } from "@/lib/studyModels";

const degree = Math.PI / 180;
const apex = { x: 200, y: 62 };
const halfBase = 70;
const faceHeight = halfBase * Math.sqrt(3);
const baseY = apex.y + faceHeight;
const entry = { x: 170, y: apex.y + 30 * Math.sqrt(3) };
const screenX = 374;
const sourceLength = 85;
const normal = Math.PI / 6;
const display = value => value.toFixed(2).replace(".", ",") + "°";
const nearEntry = (distance, angle) => `${entry.x - distance * Math.cos(angle)} ${entry.y - distance * Math.sin(angle)}`;

// Relative refractive indices from the SCHOTT N-BK7 data sheet.
const samples = [
  { id: "red", name: "Красный", wavelength: "656,3 нм", index: 1.51432, stroke: "#ff9b85" },
  { id: "violet", name: "Фиолетовый", wavelength: "435,8 нм", index: 1.52668, stroke: "#d7baff" },
];

function trace(incidence, sample) {
  const { inside, exit, deviation } = prismAngles(incidence, sample.index);
  const slope = Math.tan((30 - inside) * degree);
  // Intersect the internal ray with the right face, y - apex.y = √3 (x - apex.x).
  const x = (entry.y - slope * entry.x - apex.y + Math.sqrt(3) * apex.x) / (Math.sqrt(3) - slope);
  const y = entry.y + slope * (x - entry.x);
  const screenY = y + (screenX - x) * Math.tan((exit - 30) * degree);
  return { ...sample, x, y, screenY, deviation };
}

export function PrismExperiment() {
  const [incidence, setIncidence] = useState(48);
  const title = useId();
  const glass = useId();
  const stage = useId();
  const light = useId();
  // This range keeps both colours emerging, with neither ray subject to total internal reflection.
  const rays = samples.map(sample => trace(incidence, sample));
  const incoming = (incidence - 30) * degree;
  const incidentX = entry.x - sourceLength * Math.cos(incoming);
  const incidentY = entry.y + sourceLength * Math.sin(incoming);
  const angleArc = `M${nearEntry(28, -incoming)} A28 28 0 0 1 ${nearEntry(28, normal)}`;
  return <section className="shop-prism-experiment" aria-labelledby={title}>
    <svg viewBox="0 0 418 230" className="shop-prism-optics" role="img"
      aria-label="Луч входит слева в стеклянную призму. Угол падения отмечен дугой от пунктирной нормали. Два цветных луча выходят к экрану справа.">
      <defs>
        <linearGradient id={glass} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop stopColor="#b8e4ef" stopOpacity=".47" /><stop offset=".55" stopColor="#a3a4fa" stopOpacity=".11" /><stop offset="1" stopColor="#ba92d6" stopOpacity=".44" />
        </linearGradient>
        <radialGradient id={stage} gradientTransform="translate(0 0.15) scale(1 .68)">
          <stop stopColor="#584879" /><stop offset="1" stopColor="#2c213d" />
        </radialGradient>
        <filter id={light} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <rect width="418" height="230" rx="20" fill={`url(#${stage})`} />
      <path d="M20 197H398" stroke="#c4b5d2" strokeOpacity=".2" />
      <rect x={screenX} y="81" width="8" height="123" rx="3" fill="#dfd1eb" />
      <path d={`M${apex.x - halfBase} ${baseY}L${apex.x} ${apex.y}L${apex.x + halfBase} ${baseY}Z`} fill={`url(#${glass})`} stroke="#cbcee8" strokeWidth="1.5" />
      <path d="M200 66l-43 76M149 169h96" stroke="#d6edf8" strokeOpacity=".36" strokeWidth="2" strokeLinecap="round" />
      <path d={`M${nearEntry(48, normal)} L${entry.x} ${entry.y}`} fill="none" stroke="#e4d6ed" strokeWidth="1.2" strokeDasharray="4 4" />
      <path d={angleArc} fill="none" stroke="#e9cfa8" strokeWidth="1.2" />
      <path d={`M${incidentX} ${incidentY}L${entry.x} ${entry.y}`} stroke="#ffe4a2" strokeWidth="8" filter={`url(#${light})`} />
      <path d={`M${incidentX} ${incidentY}L${entry.x} ${entry.y}`} stroke="#fff3cb" strokeWidth="2.4" />
      {rays.map(ray => <g key={ray.id} fill="none" stroke={ray.stroke}>
        <path d={`M${entry.x} ${entry.y}L${ray.x} ${ray.y}L${screenX} ${ray.screenY}`} strokeWidth="6" filter={`url(#${light})`} />
        <path d={`M${entry.x} ${entry.y}L${ray.x} ${ray.y}L${screenX} ${ray.screenY}`} strokeWidth="1.8" strokeLinecap="round" />
      </g>)}
      <text x="22" y="30">Белый свет</text><text x="391" y="30" textAnchor="end">Экран</text>
    </svg>
    <div className="shop-prism-controls">
      <h3 id={title}>Отклонение лучей</h3>
      <div className="shop-prism-angle">
        <span>Угол падения</span><output aria-hidden="true">{incidence}°</output>
        <Slider value={[incidence]} min={42} max={70} step={1} onValueChange={([value]) => setIncidence(value)}
          thumbProps={{ "aria-label": "Угол падения", "aria-valuetext": `${incidence}° от нормали` }} />
      </div>
      <dl className="shop-prism-readings" aria-label="Отклонение от исходного направления">
        {rays.map(ray => <div key={ray.id} data-ray={ray.id}><dt>{ray.name}<span>{ray.wavelength}</span></dt><dd>{display(ray.deviation)}</dd></div>)}
      </dl>
      <p>Сравни отклонения от исходного направления. Показатели преломления взяты для <a href="https://media.schott.com/api/public/content/41e799d0bf874807a0bb8e702fbb75b5?v=54856406" target="_blank" rel="noreferrer">стекла N-BK7</a>.</p>
    </div>
  </section>;
}
