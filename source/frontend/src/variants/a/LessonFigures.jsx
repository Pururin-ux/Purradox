import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Rich } from "@/components/shared/Tex";
import { lensState } from "@/lib/studyModels";
import { LessonArtwork, LessonProp } from "./LessonArt";
import MirrorPlate from "./MirrorPlate";
import { AccommodationScene, CollisionBench, InductorTrace } from "./LessonWorkbenches";
import { DecayProducts, ExpansionPlate, HarmonicTrack, NuclearBalance, ReactionLedger, WallPressureTrial } from "./LessonExperiments";
import { DropComparison } from "./DropComparison";
import { BicycleGapScene, TrainFrameScene } from "./RelativeMotionScenes";
import { OrbitComparison, PowerLifts, RefractionFronts, VaporBalance } from "./LessonDemonstrations";
import "./lesson-workbenches.css";
import "./lesson-experiments.css";
import "./lesson-motion-scenes.css";
import "./lesson-demonstrations.css";

const ink = "var(--resume-ink)";
const plum = "#77519a";
const ochre = "#9a5f22";
const teal = "#356e70";
const muted = "#8b7695";

function Arrow({ from, to, color, dashed = false, outline }) {
  const [x, y] = to;
  const dx = x - from[0], dy = y - from[1];
  const length = Math.hypot(dx, dy);
  if (!length) return null;
  const ux = dx / length, uy = dy / length;
  const baseX = x - 10 * ux, baseY = y - 10 * uy;
  const head = `M ${baseX + 4.5 * uy} ${baseY - 4.5 * ux} L ${x} ${y} L ${baseX - 4.5 * uy} ${baseY + 4.5 * ux}`;
  return <g stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
    {outline && <path d={`M${from[0]} ${from[1]}L${x} ${y} ${head}`} stroke={outline} strokeWidth="5.5" />}
    <line x1={from[0]} y1={from[1]} x2={x} y2={y} strokeDasharray={dashed ? "5 5" : undefined} />
    <path d={head} />
  </g>;
}

function Diagram({ title, children, viewBox = "0 0 360 216" }) {
  return <svg viewBox={viewBox} role="img" aria-label={title} className="lesson-figure-svg">
    {children}
  </svg>;
}

function Route() {
  const point = x => 32 + x * 23;
  return <Diagram title="Сначала от 0 до 12 метров вправо, потом на 7 метров влево. Конечная координата 5 метров." viewBox="0 0 360 170">
    <text x="32" y="22" fill={plum}>12 м вперёд</text>
    <Arrow from={[point(0), 38]} to={[point(12), 38]} color={plum} />
    <Arrow from={[point(12), 68]} to={[point(5), 68]} color={ochre} />
    <text x={point(5)} y="93" fill={ochre}>7 м обратно</text>
    <Arrow from={[point(0), 119]} to={[337, 119]} color={muted} />
    {[0, 5, 12].map(x => <g key={x}>
      <line x1={point(x)} x2={point(x)} y1="112" y2="126" stroke={muted} strokeWidth="2" />
      <text x={point(x)} y="149" textAnchor="middle">{x}</text>
    </g>)}
    <text x="344" y="108" textAnchor="end">x, м</text>
  </Diagram>;
}

function Meeting() {
  return <Diagram title="Бегуны стартуют с отметок 0 и 18 метров навстречу друг другу. Прямые пересекаются через 6 секунд на отметке 12 метров." viewBox="0 0 360 187">
    <Axes x={51} y={144} right={332} top={29} xlabel="t, с" ylabel="x, м" />
    <path d="M51 72 H243 V144" fill="none" stroke={muted} strokeDasharray="4 5" />
    <path d="M51 144L307 48" stroke={plum} strokeWidth="3" fill="none" />
    <path d="M51 36L307 84" stroke={teal} strokeWidth="3" fill="none" />
    <circle cx="243" cy="72" r="5.5" fill={ochre} />
    <text x="41" y="41" textAnchor="end">18</text>
    <text x="41" y="77" textAnchor="end">12</text>
    <text x="243" y="166" textAnchor="middle">6</text>
    <text x="243" y="54" textAnchor="middle" fill={ochre}>Встреча</text>
  </Diagram>;
}

function RightTriangle() {
  const start = [80, 190], corner = [206, 190], finish = [206, 22];
  return <Diagram title="Два перпендикулярных перемещения: 6 метров вправо и 8 вверх. Перемещение из начала в конец равно 10 метрам.">
    <path d="M 80 190 H 206 V 22 Z" fill="#ece2f4" />
    <path d="M 191 190 V 175 H 206" stroke={muted} strokeWidth="1.5" fill="none" />
    <Arrow from={start} to={corner} color={teal} />
    <Arrow from={corner} to={finish} color={teal} />
    <Arrow from={start} to={finish} color={plum} />
    <text x="143" y="212" textAnchor="middle" fill={teal}>6 м</text>
    <text x="223" y="111" fill={teal}>8 м</text>
    <text x="109" y="99" fill={plum}>10 м</text>
  </Diagram>;
}

function ProjectionAxis() {
  const [flipped, setFlipped] = useState(false);
  const axisStart = flipped ? [316,133] : [44,133];
  const axisEnd = flipped ? [44,133] : [316,133];
  const projection = flipped ? "+3" : "−3";
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Предмет сместился влево на три метра. Ось направлена ${flipped ? "влево" : "вправо"}. Проекция ${projection} метра.`} viewBox="0 0 360 192">
      <Arrow from={[241,60]} to={[103,60]} color={teal} />
      <path d="M103 69V125 M241 69V125" stroke={muted} strokeDasharray="4 5" />
      <Arrow from={axisStart} to={axisEnd} color={plum} />
      <circle cx="103" cy="133" r="4" fill={plum} /><circle cx="241" cy="133" r="4" fill={plum} />
      <text x="173" y="40" textAnchor="middle" fill={teal}>3 м влево</text>
      <text x="103" y="160" textAnchor="middle">{projection} м</text>
      <text x="241" y="160" textAnchor="middle">0</text>
      <text x={flipped ? 29 : 331} y="139" textAnchor="middle" fill={plum}>x</text>
    </Diagram>
    <ToggleGroup type="single" value={flipped ? "left" : "right"} onValueChange={value => { if(value) setFlipped(value === "left"); }}
      aria-label="Направление оси" className="lesson-experiment-options">
      <ToggleGroupItem value="right">Ось вправо</ToggleGroupItem>
      <ToggleGroupItem value="left">Ось влево</ToggleGroupItem>
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">Проекция {projection} м. Модуль 3 м.</p>
  </div>;
}

function LiftBraking() {
  return <Diagram title="Лифт едет вверх и замедляется, ускорение направлено вниз. На человека действуют сила тяжести 500 ньютонов вниз и реакция весов 400 ньютонов вверх." viewBox="0 0 360 206">
    <rect x="23" y="32" width="139" height="144" rx="10" fill="#efdfed" stroke={muted} strokeWidth="1.5" />
    <path d="M81 55 V158" stroke={muted} strokeDasharray="4 5" />
    <Arrow from={[65,115]} to={[65,59]} color={teal} />
    <Arrow from={[111,94]} to={[111,150]} color={ochre} />
    <text x="49" y="83" textAnchor="end" fill={teal}>v</text>
    <text x="127" y="137" fill={ochre}>a</text>
    <text x="92" y="195" textAnchor="middle">Движение лифта</text>
    <path d="M181 40 V165" stroke={muted} strokeOpacity=".47" />
    <Arrow from={[244,99]} to={[244,49]} color={teal} />
    <Arrow from={[244,99]} to={[244,162]} color={plum} />
    <circle cx="244" cy="99" r="5" fill={ink} />
    <text x="266" y="56" fill={teal}>N</text>
    <text x="266" y="155" fill={plum}>mg</text>
    <text x="263" y="195" textAnchor="middle">Силы на человека</text>
  </Diagram>;
}

function ElevatorScale({ figure }) {
  const [acceleration, setAcceleration] = useState(-2);
  const mass = 50;
  const gravity = 10;
  const reading = mass * (gravity + acceleration);
  const accelerationText = String(acceleration).replace("-", "−");
  const accelerationTip = 57 - Math.sign(acceleration) * (11 + Math.abs(acceleration) * 2.6);
  return <div className="lesson-figure-experiment lesson-elevator" data-nodrag>
    {figure.art && <div className="elevator-picture">
      <LessonArtwork art={figure.art} sizes="(max-width: 740px) calc(100vw - 76px), 560px" />
      <b className="elevator-meter" aria-hidden="true">{reading} Н</b>
      <svg className="elevator-vector" viewBox="0 0 65 110" aria-hidden="true">
        <Arrow from={[18,83]} to={[18,29]} color="#f3dcdc" />
        <text x="18" y="21" textAnchor="middle">y</text>
        {acceleration !== 0 && <Arrow from={[40,57]} to={[40,accelerationTip]} color="#ffda95" />}
        <text x="43" y="106" textAnchor="middle">{acceleration === 0 ? "aᵧ = 0" : "aᵧ"}</text>
      </svg>
    </div>}
    <div className="lesson-reflection-control">
      <span>Ускорение лифта</span><output>{accelerationText} м/с²</output>
      <Slider value={[acceleration]} min={-10} max={4} step={2} onValueChange={([value]) => setAcceleration(value)}
        className="lesson-reflection-slider" thumbProps={{"aria-label":"Ускорение лифта","aria-valuetext":`${accelerationText} м/с²`}} />
      <p className="lesson-ray-reading" aria-live="polite">{reading === 0 ? "Весы показывают 0 Н. Свободное падение." : `Весы показывают ${reading} Н.`}</p>
    </div>
  </div>;
}

function GravityDistance() {
  const planet = [119, 110];
  const radius = 57;
  return <Diagram title="От центра планеты до её поверхности 1 радиус. На высоте одного радиуса расстояние от центра равно двум радиусам, а ускорение свободного падения составляет четверть значения на поверхности." viewBox="0 0 360 203">
    <circle cx={planet[0]} cy={planet[1]} r={radius} fill="#36586a" />
    <path d="M82 68Q139 70 172 100 M68 105Q123 109 153 145 M89 155Q135 167 171 126" fill="none" stroke="#598a8e" strokeWidth="5" strokeLinecap="round" />
    <circle cx="119" cy="110" r="3.5" fill="#fff5e1" />
    <path d="M119 110H233 M176 119V158 M233 119V158" fill="none" stroke="#bdaac7" strokeWidth="1.5" strokeDasharray="4 4" />
    <circle cx="176" cy="110" r="5" fill="#efb866" stroke="#6a452f" strokeWidth="1.2" />
    <circle cx="233" cy="110" r="5" fill="#efb866" stroke="#6a452f" strokeWidth="1.2" />
    <text x="173" y="37" textAnchor="middle" fill={ochre}>На поверхности</text>
    <path d="M176 47V98 M233 98L254 78" stroke={muted} strokeWidth="1.2" />
    <text x="262" y="71" fill={teal}>g₀/4</text>
    <text x="189" y="92" fill={ochre}>g₀</text>
    <path d="M119 174H233 M119 166V180 M176 166V180 M233 166V180" stroke={plum} strokeWidth="1.4" />
    <text x="147.5" y="197" textAnchor="middle">R</text><text x="204.5" y="197" textAnchor="middle">R</text>
  </Diagram>;
}

function UnitCube() {
  return <Diagram title="Куб со стороной 1 сантиметр, то есть 0,01 метра. Для объёма эту длину берут три раза." viewBox="0 0 360 175">
    <path d="M 91 59 L 158 26 L 241 62 L 174 98 Z" fill="#f6dcc2" />
    <path d="M 91 59 L 174 98 V 162 L 91 124 Z" fill="#e4d5f0" />
    <path d="M 174 98 L 241 62 V 126 L 174 162 Z" fill="#bfa6d5" />
    <path d="M 91 59 L 158 26 L 241 62 V 126 L 174 162 L 91 124 Z M 91 59 L 174 98 L 241 62 M 174 98 V 162" fill="none" stroke={plum} strokeWidth="2" />
    <text x="97" y="161" fill={plum}>1 см</text>
    <text x="193" y="157" fill={plum}>1 см</text>
    <text x="253" y="101" fill={plum}>1 см</text>
  </Diagram>;
}

function SignedArea() {
  const x = t => 50 + t * 47, y = v => 116 - v * 33;
  return <Diagram title="От 0 до 3 секунд скорость плюс 2 метра в секунду, затем до 5 секунд минус 1 метр в секунду. Площади равны плюс 6 и минус 2 метра.">
    <rect x={x(0)} y={y(2)} width={x(3) - x(0)} height={y(0) - y(2)} rx="4" fill="#e1d2f0" />
    <rect x={x(3)} y={y(0)} width={x(5) - x(3)} height={y(-1) - y(0)} rx="4" fill="#f4dfcb" />
    <Arrow from={[x(0), y(0)]} to={[324, y(0)]} color={muted} />
    <Arrow from={[x(0), 167]} to={[x(0), 33]} color={muted} />
    <path d={`M ${x(0)} ${y(2)} H ${x(3)} M ${x(3)} ${y(-1)} H ${x(5)}`} fill="none" stroke={plum} strokeWidth="3" />
    <path d={`M ${x(3)} ${y(2)} V ${y(-1)} M ${x(5)} ${y(0)} V ${y(-1)}`} fill="none" stroke={muted} strokeDasharray="4 5" />
    <text x="36" y="22">vₓ, м/с</text>
    <text x="328" y="138">t, с</text>
    <text x="36" y={y(2) + 4} textAnchor="end">2</text>
    <text x="36" y={y(-1) + 4} textAnchor="end">−1</text>
    <text x="37" y={y(0) + 5} textAnchor="end">0</text>
    <text x={x(3)} y="180" textAnchor="middle">3</text>
    <text x={x(5)} y="180" textAnchor="middle">5</text>
    <text x="118" y="89" fill={plum}>+6 м</text>
    <text x="210" y="139" fill={ochre}>−2 м</text>
  </Diagram>;
}

function ReversalArea() {
  const x = t => 54 + 49 * t;
  const y = v => 103 - 12 * v;
  return <Diagram title="Скорость уменьшается от 6 до минус 4 метров в секунду. При t = 3 секунды она проходит через ноль. Площадь над осью плюс 9 метров, под осью минус 4 метра." viewBox="0 0 360 198">
    <path d={`M${x(0)} ${y(0)}V${y(6)}L${x(3)} ${y(0)}Z`} fill="#ddc9ee" />
    <path d={`M${x(3)} ${y(0)}H${x(5)}V${y(-4)}Z`} fill="#f2d3ae" />
    <path d={`M${x(5)} ${y(0)}V${y(-4)}H${x(0)}`} fill="none" stroke={muted} strokeWidth="1.2" strokeDasharray="4 5" />
    <path d={`M278 61H254L${x(3) + 3} ${y(0) - 5}`} fill="none" stroke={muted} strokeWidth="1.2" />
    <Arrow from={[x(0), y(0)]} to={[324, y(0)]} color={ink} />
    <Arrow from={[x(0), 164]} to={[x(0), 21]} color={ink} />
    <path d={`M${x(0)} ${y(6)}L${x(5)} ${y(-4)}`} fill="none" stroke={plum} strokeWidth="3" strokeLinecap="round" />
    <circle cx={x(3)} cy={y(0)} r="4" fill={plum} />
    <g textAnchor="end">
      <text x="44" y={y(6) + 5}>6</text><text x="44" y={y(0) + 5}>0</text><text x="44" y={y(-4) + 5}>−4</text>
    </g>
    <text x="67" y="20">vₓ, м/с</text>
    <text x="327" y="128">t, с</text>
    <text x={x(3)} y="126" textAnchor="middle">3</text><text x={x(5)} y="94" textAnchor="middle">5</text>
    <text x="70" y="88" fill={plum}>+9 м</text><text x="256" y="122" fill={ochre}>−4 м</text>
    <text x="332" y="53" textAnchor="end" fill={plum}>Разворот</text>
  </Diagram>;
}

function StopTimeline() {
  const start = 51;
  const stop = 215;
  const end = 297;
  const top = 61;
  const bottom = 147;
  return <Diagram title="График пути велосипедиста. За 120 секунд он проехал 600 метров. Следующие 60 секунд он стоял, и путь не менялся." viewBox="0 0 360 191">
    <path d={`M${start} ${top}H${end}V${bottom} M${stop} ${top}V${bottom}`} fill="none" stroke={muted} strokeWidth="1.2" strokeDasharray="4 5" />
    <Arrow from={[start, bottom]} to={[329, bottom]} color={ink} />
    <Arrow from={[start, bottom]} to={[start, 29]} color={ink} />
    <path d={`M${start} ${bottom}L${stop} ${top}`} fill="none" stroke={plum} strokeWidth="3.5" strokeLinecap="round" />
    <path d={`M${stop} ${top}H${end}`} fill="none" stroke={ochre} strokeWidth="3.5" strokeLinecap="round" />
    <circle cx={stop} cy={top} r="4" fill={ink} />
    <text x="15" y="24">s, м</text><text x="332" y="171">t, с</text>
    <text x="43" y={top + 5} textAnchor="end">600</text><text x="40" y={bottom + 8} textAnchor="end">0</text>
    <text x={stop} y="171" textAnchor="middle">120</text><text x={end} y="171" textAnchor="middle">180</text>
    <text x="108" y="104" fill={plum} transform="rotate(-28 108 104)">едет</text>
    <text x="255" y="48" fill={ochre} textAnchor="middle">ждёт</text>
  </Diagram>;
}

function PositionSlope() {
  const [span,setSpan] = useState(2);
  const x = time => 50 + 85 * time;
  const y = position => 153 - 13.5 * position;
  const point = time => [x(time),y(time*time)];
  const [ax,ay] = point(1);
  const [bx,by] = point(1+span);
  const format = number => number.toLocaleString("ru");
  return <div className="lesson-figure-experiment lesson-position-slope" data-nodrag>
    <Diagram title={"График координаты x = t². Касательная в момент 1 с и секущая до момента " + format(1+span) + " с."} viewBox="0 0 360 221">
      <Axes x={50} y={153} right={336} top={25} ylabel="x, м" />
      <path d={`M${ax} ${ay}V153 M${bx} ${by}V153`} fill="none" stroke={muted} strokeWidth="1.5" strokeDasharray="4 4" />
      <polyline points={curve(48,u=>point(u*3.12))} fill="none" stroke="#61566e" strokeWidth="2" />
      <path d={`M${x(.5)} ${y(0)}L${x(2.8)} ${y(4.6)}`} fill="none" stroke={teal} strokeWidth="3.3" strokeLinecap="round" />
      <path d={`M${ax} ${ay}L${bx} ${by}`} fill="none" stroke={ochre} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="6 5" />
      <circle cx={ax} cy={ay} r="4.5" fill={teal} />
      <circle cx={bx} cy={by} r="4.5" fill={ochre} />
      <text x={ax-6} y="182" textAnchor="end">1</text>
      <text x={bx} y="182" textAnchor="middle">{format(1+span)}</text>
      <text x="338" y="143" textAnchor="end">t, с</text>
      <path d="M53 207H73" stroke={teal} strokeWidth="3" strokeLinecap="round" />
      <text x="80" y="213">Касательная</text>
      <path d="M205 207H225" stroke={ochre} strokeWidth="3" strokeLinecap="round" strokeDasharray="5 4" />
      <text x="233" y="213">Секущая</text>
    </Diagram>
    <ToggleGroup type="single" value={String(span)} onValueChange={value=>{ if(value) setSpan(Number(value)); }}
      aria-label="Интервал для секущей" className="lesson-experiment-options">
      {[2,1,.5,.25].map(value=><ToggleGroupItem key={value} value={String(value)}>{format(value)} с</ToggleGroupItem>)}
    </ToggleGroup>
    <dl className="lesson-contour-readings" aria-live="polite">
      <div><dt>По секущей</dt><dd>{format(2+span)} м/с</dd></div>
      <div><dt>По касательной</dt><dd>2 м/с</dd></div>
    </dl>
  </div>;
}

function CatchUp() {
  const x = t => 53 + t * 1.45;
  const y = position => 164 - position * .12;
  return <Diagram title="Первый бегун стартует в нуле, второй в 300 метрах впереди. Первый догоняет второго через 150 секунд на отметке 900 метров." viewBox="0 0 360 213">
    <Axes x={53} y={164} right={332} top={20} xlabel="t, с" ylabel="x, м" />
    <path d={`M53 ${y(900)}H${x(150)}V164`} fill="none" stroke={muted} strokeDasharray="4 5" />
    <path d={`M53 164L${x(180)} ${y(1080)}`} fill="none" stroke={plum} strokeWidth="3" strokeLinecap="round" />
    <path d={`M53 ${y(300)}L${x(180)} ${y(1020)}`} fill="none" stroke={teal} strokeWidth="3" strokeLinecap="round" />
    <circle cx={x(150)} cy={y(900)} r="5" fill={ochre} />
    <text x="42" y={y(300)+5} textAnchor="end">300</text>
    <text x="42" y={y(900)+5} textAnchor="end">900</text>
    <text x={x(150)} y="189" textAnchor="middle">150</text>
      <text x="140" y="91" textAnchor="middle" fill={teal}>4 м/с</text>
      <text x="161" y="127" fill={plum}>6 м/с</text>
  </Diagram>;
}

function TravelTimes() {
  return <div className="lesson-travel-times">
    <div><span>Первые 1200 м</span><span>300 с</span></div>
    <span className="lesson-travel-track" aria-hidden="true"><span /></span>
    <div><span>Следующие 1200 м</span><span>200 с</span></div>
    <span className="lesson-travel-track" aria-hidden="true"><span /></span>
  </div>;
}

function TrialReadings() {
  const x = force => 68 + 390 * (force - 1);
  const rows = [
    { label:"Сухой стол", color:ochre, y:52, values:[1.2,1.4,1.5] },
    { label:"Мокрый стол", color:teal, y:114, values:[1.1,1.3,1.4] },
  ];
  return <Diagram title="Условные измерения. На сухом столе 1,2, 1,4 и 1,5 ньютона. На мокром 1,1, 1,3 и 1,4. Интервалы перекрываются от 1,2 до 1,4 ньютона." viewBox="0 0 360 204">
    <rect x={x(1.2)} y="31" width={x(1.4)-x(1.2)} height="113" rx="6" fill="#e9ddf0" />
    {rows.map(({label,color,y,values})=><g key={label}>
      <text x="20" y={y-25} fill={color}>{label}</text>
      <path d={`M${x(values[0])} ${y}H${x(values.at(-1))}`} stroke={color} strokeOpacity=".52" strokeWidth="2.6" />
      {values.map(value=><circle key={value} cx={x(value)} cy={y} r="5" fill={color} stroke="#faf6f4" strokeWidth="1.3" />)}
    </g>)}
    <Arrow from={[x(1),153]} to={[326,153]} color={ink} />
    {[1,1.2,1.4,1.6].map(value=><g key={value}>
      <path d={`M${x(value)} 150V158`} stroke={muted} strokeWidth="1.5" />
      <text x={x(value)} y="179" textAnchor="middle">{value.toLocaleString("ru")}</text>
    </g>)}
    <text x="333" y="145" textAnchor="end">F, Н</text>
  </Diagram>;
}

function PlatformDeparture() {
  return <div className="departure-scale">
    <span>Положение передней двери</span>
    <ol aria-label="Метки положения электрички через каждые две секунды. Расстояния между метками растут.">
      {[0, 2, 4, 6].map(time => <li key={time} style={{ left: `${3 + 89 * (time / 6) ** 2}%` }}>
        {time}<span className={time === 6 ? undefined : "sr-only"}> с</span>
      </li>)}
    </ol>
  </div>;
}

function TrainDistance() {
  return <Diagram title="Скорость растёт от нуля до пяти метров в секунду за десять секунд. Площадь треугольника равна двадцати пяти метрам." viewBox="0 0 360 211">
    <Axes x={48} y={155} right={335} top={27} ylabel="vₓ, м/с" />
    <path d="M48 155L294 49V155Z" fill="#eadcf0" />
    <path d="M48 49H294V155" stroke={muted} strokeDasharray="4 4" fill="none" />
    <path d="M48 155L294 49" stroke={plum} strokeWidth="3.6" strokeLinecap="round" />
    <text x="37" y="55" textAnchor="end">5</text><text x="294" y="180" textAnchor="middle">10</text>
    <text x="333" y="145" textAnchor="end">t, с</text>
    <text x="206" y="122" textAnchor="middle" fontWeight="650" fill={plum}>25 м</text>
  </Diagram>;
}

function TossHeight() {
  const x = t => 48 + 64 * t;
  const y = h => 154 - 5.1 * h;
  const curveHeight = curve(48,t => [x(4*t),y(80*t-80*t*t)]);
  return <Diagram title="Высота мяча за четыре секунды после броска. Через две секунды мяч достигает 20 метров. Касательная в вершине горизонтальна, ускорение направлено вниз." viewBox="0 0 360 205">
    <path d={`M${x(0)} ${y(20)}H${x(2)}V${y(0)}`} fill="none" stroke={muted} strokeDasharray="4 5" />
    <Arrow from={[48,154]} to={[326,154]} color={ink} />
    <Arrow from={[48,154]} to={[48,25]} color={ink} />
    <polyline points={curveHeight} fill="none" stroke={plum} strokeWidth="3" strokeLinecap="round" />
    <path d="M148 52H204" stroke={ochre} strokeWidth="2" strokeLinecap="round" />
    <circle cx="176" cy="52" r="5" fill={ochre} />
    <text x="164" y="36" textAnchor="middle" fill={ochre}>v = 0</text>
    <text x="190" y="90" fill={teal}>a = −g</text>
    <text x="20" y="19">h, м</text><text x="330" y="176">t, с</text>
    <text x="38" y="58" textAnchor="end">20</text><text x="38" y="161" textAnchor="end">0</text>
    <text x="176" y="178" textAnchor="middle">2</text><text x="304" y="178" textAnchor="middle">4</text>
  </Diagram>;
}

function HorizontalThrow() {
  const x = t => 48 + 86 * t;
  const y = t => 35 + 13 * t*t;
  return <Diagram title="Шар летит с горизонтальной скоростью 8 метров в секунду. От точки броска до падения три равных промежутка. По горизонтали каждый отрезок равен 8 метрам. Высота 45 метров и дальность 24 метра показаны на разных масштабах." viewBox="0 0 360 218">
    <path d="M48 35V152H321" stroke={ink} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M48 35Q177 35 306 152" fill="none" stroke={plum} strokeWidth="2.8" />
    {[0,1,2,3].map(t => <g key={t}>
      <path d={`M${x(t)} ${y(t)}V172`} stroke={muted} strokeDasharray="4 5" />
      {t === 0 ? <LessonProp name="orange-ball" x={x(t)-10} y={y(t)-10} width={20} height={20} />
        : <circle cx={x(t)} cy={y(t)} r="5" fill="#f0bb78" stroke={ochre} strokeWidth="1.3" />}
      <text x={x(t)} y="191" textAnchor="middle">{t * 8}</text>
    </g>)}
    <Arrow from={[57,35]} to={[103,35]} color={teal} />
    <text x="87" y="24" fill={teal} textAnchor="middle">8 м/с</text>
    <path d="M28 35H36 M32 35V152 M28 152H36" stroke={muted} strokeWidth="1.5" />
    <text x="21" y="95" textAnchor="middle" transform="rotate(-90 21 95)">45 м</text>
    <text x="329" y="191">м</text>
  </Diagram>;
}

function Tangent() {
  const [angle, setAngle] = useState(0);
  const [radius, setRadius] = useState(10);
  const theta = angle * Math.PI / 180;
  const radial = [Math.cos(theta), -Math.sin(theta)];
  const tangent = [radial[1], -radial[0]];
  const center = [180, 120];
  const point = center.map((origin, i) => origin + radial[i] * radius * 6);
  const tip = (direction, length) => point.map((origin, i) => origin + direction[i] * length);
  const velocityTip = tip(tangent, radius * 4.1);
  const accelerationTip = tip(radial, -radius * 3.4);
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Точка на расстоянии ${radius} сантиметров от оси. Угол поворота ${angle} градусов. Скорость по касательной, ускорение к центру.`} viewBox="0 0 360 240">
      <circle cx={center[0]} cy={center[1]} r="76" fill="#342443" />
      {[64, 48, 33].map(r => <circle key={r} cx={center[0]} cy={center[1]} r={r} fill="none" stroke="#634764" />)}
      <circle cx={center[0]} cy={center[1]} r="17" fill="#a17b9d" />
      <circle cx={center[0]} cy={center[1]} r="4" fill="#fff5e7" />
      <path d={`M180 120L${point[0]} ${point[1]}`} stroke="#bf9dc8" strokeWidth="1.8" strokeDasharray="4 4" />
      <Arrow from={point} to={velocityTip} color="#ffe3a3" outline="#4e385c" />
      <Arrow from={point} to={accelerationTip} color="#a8dfd3" />
      <circle cx={point[0]} cy={point[1]} r="5.5" fill="#f8ad84" stroke="#342443" strokeWidth="1.2" />
      <rect x="77" y="197" width="13" height="13" rx="4" fill="#ffe3a3" stroke="#9a5f22" />
      <text x="99" y="208">Скорость</text>
      <rect x="202" y="197" width="13" height="13" rx="4" fill="#a8dfd3" stroke={teal} />
      <text x="224" y="208">Ускорение</text>
    </Diagram>
    <div className="lesson-reflection-control">
      <span>Угол поворота</span><output>{angle}°</output>
      <Slider value={[angle]} min={0} max={360} step={15} onValueChange={([value]) => setAngle(value)}
        className="lesson-reflection-slider" thumbProps={{"aria-label":"Угол поворота","aria-valuetext":`${angle}°`}} />
      <span>Радиус</span><output>{radius} см</output>
      <Slider value={[radius]} min={4} max={12} step={1} onValueChange={([value]) => setRadius(value)}
        className="lesson-reflection-slider" thumbProps={{"aria-label":"Радиус","aria-valuetext":`${radius} см`}} />
      <p className="lesson-ray-reading" aria-live="polite">Линейная скорость {radius * 3} см/с</p>
    </div>
  </div>;
}

function Lever() {
  return <Diagram title="Левое плечо рычага 0,6 метра, правое 0,2 метра. Вниз слева действует 30 ньютонов, справа 90 ньютонов. Моменты равны.">
    <LessonProp name="wood-lever" x={33} y={119} width={282} height={49} fit="none" />
    <Arrow from={[57, 55]} to={[57, 118]} color={teal} />
    <Arrow from={[297, 34]} to={[297, 118]} color={plum} />
    <text x="57" y="44" textAnchor="middle" fill={teal}>30 Н</text>
    <text x="297" y="22" textAnchor="middle" fill={plum}>90 Н</text>
    <path d="M 57 184 H 297 M 57 177 V 191 M 237 177 V 191 M 297 177 V 191" stroke={muted} strokeWidth="1.5" />
    <text x="147" y="208" textAnchor="middle">0,6 м</text>
    <text x="267" y="208" textAnchor="middle">0,2 м</text>
  </Diagram>;
}

function WavePulse() {
  const x0 = 170;
  const wave = (x, center, base) => base - 28 * Math.exp(-((x - center) ** 2) / 680);
  return <Diagram title="Импульс на верёвке движется вправо. Лента привязана к одной точке и перемещается по вертикали." viewBox="0 0 360 187">
    <line x1={x0} x2={x0} y1="21" y2="157" stroke={muted} strokeDasharray="4 5" />
    {[[91, 61], [170, 111], [249, 161]].map(([center, base], i) => {
      const rope = Array.from({length:61}, (_, n) => {
        const x = 40 + n * 4.5;
        return `${x} ${wave(x, center, base)}`;
      }).join(" L ");
      return <g key={base}>
        <text x="18" y={base + 4}>t{i + 1}</text>
        <path d={`M ${rope}`} fill="none" stroke={plum} strokeWidth="2.8" strokeLinecap="round" />
        <circle cx={x0} cy={wave(x0, center, base)} r="5" fill="#eeb768" stroke={ochre} />
      </g>;
    })}
    <Arrow from={[213, 13]} to={[284, 13]} color={teal} />
    <text x="297" y="18" fill={teal}>волна</text>
  </Diagram>;
}

function HeatEngine() {
  return <Diagram title="От нагревателя поступило 2000 джоулей. Из них 600 пошло на работу и 1400 ушло к холодильнику. Ширина лент пропорциональна энергии." viewBox="0 0 360 209">
    <path d="M26 73H142V133H26Z" fill="#e9aa79" />
    <path d="M142 73C219 73 224 50 307 50V68C224 68 219 91 142 91Z" fill="#ab83ba" />
    <path d="M142 91C220 91 224 127 307 127V169C224 169 220 133 142 133Z" fill="#9ec5cc" />
    <path d="M142 67V140" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    <text x="27" y="51" fill={ochre}>От нагревателя</text>
    <text x="29" y="108" fill={ink} fontWeight="650">2000 Дж</text>
    <text x="307" y="35" textAnchor="end" fill={plum}>600 Дж · работа</text>
    <text x="307" y="195" textAnchor="end" fill={teal}>1400 Дж · холодильнику</text>
  </Diagram>;
}

function GasEnergyBudget() {
  return <Diagram title="Газ получил 90 джоулей теплоты и совершил работу 25 джоулей, подняв поршень. Внутренняя энергия газа выросла на 65 джоулей." viewBox="0 0 360 226">
    <path d="M121 29V186H242V29" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M123 93H240V184H123Z" fill="#f4d9bd" />
    <path d="M123 81H240V93H123Z" fill="#8d688b" />
    <path d="M181.5 46V81" stroke="#8d688b" strokeWidth="8" />
    <path d="M126 111H237" stroke={plum} strokeWidth="2" strokeDasharray="5 5" opacity=".75" />
    <path d="M242 111H263V191L254 198" fill="none" stroke={muted} strokeWidth="1.2" />
    <Arrow from={[44,147]} to={[113,147]} color={ochre} />
    <Arrow from={[220,77]} to={[220,34]} color={plum} />
    <g fontWeight="650">
      <text x="36" y="132" fill={ochre}>90 Дж</text>
      <text x="253" y="38" fill={plum}>25 Дж</text>
      <text x="182" y="154" textAnchor="middle">ΔU = 65 Дж</text>
    </g>
    <text x="36" y="170" fill={ochre}>Теплота</text>
    <text x="253" y="59" fill={plum}>Работа газа</text>
    <text x="182" y="216" textAnchor="middle">Прежнее положение поршня</text>
  </Diagram>;
}

function ThermalCycle() {
  const [direction, setDirection] = useState("clockwise");
  const clockwise = direction === "clockwise";
  const work = clockwise ? "+200" : "−200";
  const arrows = [
    [[174,70],[219,70]], [[286,87],[286,109]],
    [[219,124],[174,124]], [[122,109],[122,87]],
  ];
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Цикл на графике давления и объёма, ${clockwise ? "по" : "против"} часовой стрелки. Работа газа за цикл ${work} джоулей.`} viewBox="0 0 360 224">
      <Axes x={40} y={178} right={334} top={34} ylabel="p, кПа" />
      <rect x="122" y="70" width="164" height="54" fill="#edcfdf" />
      <path d="M40 70H122 M40 124H122 M122 124V178 M286 124V178" stroke={muted} strokeDasharray="4 5" fill="none" />
      <path d="M122 70H286V124H122Z" fill="none" stroke={plum} strokeWidth="2.2" strokeLinejoin="round" />
      {arrows.map(([from,to]) => <Arrow key={from.join()} from={clockwise ? from : to} to={clockwise ? to : from} color={plum} />)}
      <text x="34" y="75" textAnchor="end">200</text><text x="34" y="129" textAnchor="end">100</text>
      <text x="122" y="201" textAnchor="middle">1</text><text x="286" y="201" textAnchor="middle">3</text>
      <text x="335" y="165" textAnchor="end">V, л</text>
    </Diagram>
    <ToggleGroup type="single" value={direction} onValueChange={value => value && setDirection(value)}
      className="lesson-experiment-options" aria-label="Направление цикла">
      <ToggleGroupItem value="clockwise">По часовой</ToggleGroupItem>
      <ToggleGroupItem value="counterclockwise">Против часовой</ToggleGroupItem>
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">Работа газа за цикл {work} Дж</p>
  </div>;
}

function RailJoint() {
  return <Diagram title="У холодных рельсов зазор 12 миллиметров. При нагреве каждый конец смещается к стыку на 4,8 миллиметра. Новый зазор 2,4 миллиметра." viewBox="0 0 360 211">
    <text x="24" y="24" fill={teal}>До нагрева</text>
    <LessonProp name="rail-end" x={24} y={35} width={96} height={29} fit="none" />
    <LessonProp name="rail-end" x={240} y={35} width={96} height={29} fit="none" />
    <path d="M120 67V80 M240 67V80 M120 74H240" stroke={teal} strokeWidth="1.8" />
    <text x="180" y="68" textAnchor="middle" fill={teal}>12 мм</text>
    <text x="24" y="109" fill={ochre}>После нагрева</text>
    <LessonProp name="rail-end" x={24} y={129} width={144} height={29} fit="none" className="lesson-warm-metal" />
    <LessonProp name="rail-end" x={192} y={129} width={144} height={29} fit="none" className="lesson-warm-metal" />
    <path d="M120 122V160 M240 122V160" stroke={muted} strokeDasharray="4 4" fill="none" />
    <Arrow from={[122,121]} to={[164,121]} color={ochre} />
    <Arrow from={[238,121]} to={[196,121]} color={ochre} />
    <path d="M168 160V175 M192 160V175 M168 169H192" stroke={ochre} strokeWidth="1.8" />
    <text x="180" y="196" textAnchor="middle" fill={ochre}>2,4 мм</text>
  </Diagram>;
}

function Depth() {
  const depthId = useId();
  const [depth, setDepth] = useState(2);
  const pressure = 1000 * 10 * depth / 1000;
  const depthLabel = depth.toLocaleString("ru") + " м";
  const pressureLabel = pressure + " кПа";
  const level = 48 + depth * 26;
  return <div className="lesson-depth lesson-figure-experiment" data-nodrag>
    <Diagram title={`Слева узкий сосуд, справа широкий. Оба датчика на глубине ${depthLabel}, оба показывают ${pressureLabel} сверх атмосферного.`} viewBox="24 16 336 166">
      <defs>
        <linearGradient id={depthId + "-water"} x2="0" y2="1">
          <stop stopColor="#d8eee9" /><stop offset="1" stopColor="#a6cbe1" />
        </linearGradient>
      </defs>
      <path d="M42 48H126V172H42Z M205 48H340L310 172H229Z" fill={`url(#${depthId}-water)`} />
      <path d="M42 25V172H126V25 M200 25L229 172H310L346 25" fill="none" stroke={ink} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M43 48H126 M205 48H340" stroke={teal} strokeWidth="2" />
      <path d={`M84 ${level}H271`} stroke="#746490" strokeDasharray="4 5" strokeWidth="1.5" />
      {depth > 0 && <path d={`M164 48V${level} M158 48H170 M158 ${level}H170`} stroke={plum} strokeWidth="1.7" />}
      <circle cx="84" cy={level} r="6" fill="#ffe2ac" stroke={ochre} strokeWidth="2" />
      <circle cx="271" cy={level} r="6" fill="#ffe2ac" stroke={ochre} strokeWidth="2" />
    </Diagram>
    <p className="depth-reading-label">Давление сверх атмосферного</p>
    <dl className="depth-readings">
      <div><dt>Слева</dt><dd>{pressureLabel}</dd></div>
      <div><dt>Справа</dt><dd>{pressureLabel}</dd></div>
    </dl>
    <div className="lesson-reflection-control depth-control">
      <span id={depthId}>Глубина датчиков</span><output>{depthLabel}</output>
      <Slider className="lesson-reflection-slider" min={0} max={4} step={.5} value={[depth]}
        onValueChange={([value]) => setDepth(value)}
        thumbProps={{ "aria-labelledby": depthId, "aria-valuetext": `${depthLabel}, в обоих сосудах ${pressureLabel} сверх атмосферного` }} />
    </div>
  </div>;
}

function InclineChoice() {
  const [length, setLength] = useState(4);
  const height = 1, weight = 100;
  const work = weight * height;
  const force = work / length;
  const top = [270,58], base = 110;
  const footOf = length => top[0] - 52 * Math.sqrt(length ** 2 - height ** 2);
  const foot = footOf(length);
  const midpoint = [(foot + top[0]) / 2, (top[1] + base) / 2];
  const radians = Math.atan2(base-top[1],top[0]-foot);
  const direction = [Math.cos(radians), -Math.sin(radians)];
  const arrowStart = [midpoint[0],midpoint[1]-24];
  const arrowTip = [arrowStart[0] + direction[0] * force * 1.25, arrowStart[1] + direction[1] * force * 1.25];
  return <div className="incline-choice" data-nodrag>
    <Diagram title={`Груз 100 ньютонов поднимают на 1 метр по скату длиной ${length} метра. Тяга ${force} ньютонов, работа ${work} джоулей.`} viewBox="0 0 328 153">
      <path d={`M${foot} ${base}L${top.join(" ")}V${base}Z`} fill="#eed7bc" />
      <path d="M29 110H302 M270 58H294" fill="none" stroke={muted} strokeWidth="1.4" />
      <path d={`M${footOf(length === 4 ? 2 : 4)} ${base}L${top.join(" ")}`} fill="none" stroke="#9b7b8e" strokeDasharray="5 4" strokeWidth="1.6" />
      <path d={`M${foot} ${base}L${top.join(" ")}`} fill="none" stroke="#835c47" strokeWidth="2.7" />
      <rect x="-10" y="-24" width="20" height="22" rx="4" fill="#f8d19b" stroke="#846047" strokeWidth="1.6"
        transform={`translate(${midpoint.join(" ")}) rotate(${-radians*180/Math.PI})`} />
      <Arrow from={arrowStart} to={arrowTip} color={plum} />
      <text x={arrowStart[0]-6} y={arrowStart[1]-13} fill={plum} textAnchor="middle">{force} Н</text>
      <path d="M286 58v52m-4-52h8m-8 52h8" stroke={teal} strokeWidth="1.6" />
      <text x="296" y="90" fill="#345663">1 м</text>
      <text x={(foot+top[0])/2} y="139" textAnchor="middle">{length} м по скату</text>
    </Diagram>
    <ToggleGroup className="lesson-experiment-options incline-options" type="single" aria-label="Длина ската" value={String(length)}
      onValueChange={value => value && setLength(Number(value))}>
      <ToggleGroupItem value="2">Скат 2 м</ToggleGroupItem><ToggleGroupItem value="4">Скат 4 м</ToggleGroupItem>
    </ToggleGroup>
    <p className="incline-work" role="status">{force} Н × {length} м = <b>{work} Дж</b></p>
  </div>;
}

function Vessels() {
  return <Diagram title="Две несмешивающиеся жидкости в сообщающихся сосудах. При одинаковом давлении сверху столб жидкости меньшей плотности выше. Сравнение ведут на уровне границы жидкостей." viewBox="0 0 360 220">
    <path d="M58 121V174Q58 184 69 184H291Q302 184 302 174V80H252V149H108V121Z" fill="#b6d7dc" />
    <path d="M59 70H108V121H59Z" fill="#e7bd84" />
    <path d="M58 39V174Q58 184 69 184H291Q302 184 302 174V39 M108 39V147H252V39" stroke={ink} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <path d="M59 70 H108 M252 80 H302" stroke={muted} strokeWidth="2" />
    <path d="M46 121H315" stroke={plum} strokeWidth="1.5" strokeDasharray="5 5" />
    <path d="M41 70 H49 M45 70 V121 M41 121 H49 M312 80 H320 M316 80 V121 M312 121 H320" fill="none" stroke={muted} strokeWidth="1.5" />
    <text x="33" y="101" textAnchor="end">h₁</text><text x="324" y="107">h₂</text>
    <text x="84" y="58" textAnchor="middle" fill={ochre}>Масло</text>
    <text x="278" y="68" textAnchor="middle" fill={teal}>Вода</text>
    <text x="180" y="211" textAnchor="middle" fill={plum}>Сравниваем на уровне пунктира</text>
  </Diagram>;
}

function HydraulicLift() {
  const [stroke,setStroke] = useState(4);
  const rise = stroke / 4;
  const left = 52 + stroke * 7;
  const right = 132 - rise * 7;
  return <div className="lesson-figure-experiment lesson-hydraulic" data-nodrag>
    <Diagram title={"Малый поршень площадью 5 квадратных сантиметров опускается на " + stroke + " см, большой площадью 20 поднимается на " + rise + " см."} viewBox="0 0 360 228">
      <path d={`M57 ${left}H101V166H195V${right}H306V193H57Z`} fill="#bcdfe2" />
      <path d="M57 47V193H306V85 M101 47V166H195V85" fill="none" stroke={teal} strokeWidth="2.8" strokeLinejoin="round" />
      <path d={`M79 ${left - 25}V${left} M250 ${right - 25}V${right}`} stroke={ink} strokeWidth="4.4" strokeLinecap="round" />
      <path d={`M57 ${left}H101 M195 ${right}H306`} stroke={plum} strokeWidth="7" strokeLinecap="round" />
      <path d="M50 52H108 M187 132H313" fill="none" stroke={muted} strokeDasharray="4 4" />
      <Arrow from={[123,52]} to={[123,81]} color={ochre} />
      <Arrow from={[328,148]} to={[328,119]} color={ochre} />
      <text x="79" y="22" textAnchor="middle">5 см²</text>
      <text x="250" y="64" textAnchor="middle">20 см²</text>
      <text x="180" y="217" textAnchor="middle" fill={teal}>Несжимаемая жидкость</text>
    </Diagram>
    <ToggleGroup type="single" aria-label="Ход малого поршня" value={String(stroke)}
      onValueChange={value => { if (value) setStroke(Number(value)); }} className="lesson-experiment-options">
      {[4,8,12].map(value => <ToggleGroupItem key={value} value={String(value)}>{value} см вниз</ToggleGroupItem>)}
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">Широкий поршень поднялся на {rise} см.</p>
  </div>;
}

function PoolPressure() {
  return <div className="lesson-pool-pressure">
    <Diagram title="В открытом бассейне давление на поверхности 100 килопаскалей. На глубине 2 метра добавляется 20 килопаскалей." viewBox="0 0 360 151">
      <rect x="20" y="46" width="142" height="90" rx="9" fill="#cde4ec" />
      <path d="M20 46Q39 37 58 46T96 46T134 46T162 46" stroke={teal} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="109" cy="104" r="5" fill={plum} />
      <path d="M53 48V104H101" stroke={muted} strokeDasharray="4 4" fill="none" />
      <text x="66" y="83" fill={plum}>2 м</text>
      <text x="186" y="31" fill={teal}>Воздух</text><text x="338" y="31" textAnchor="end">100 кПа</text>
      <text x="186" y="62" fill={plum}>Вода</text><text x="338" y="62" textAnchor="end">+20 кПа</text>
      <path d="M186 76H338" stroke={muted} />
      <text x="186" y="104" fontWeight="650">Всего</text><text x="338" y="104" textAnchor="end" fontWeight="650">120 кПа</text>
    </Diagram>
    <div className="lesson-pool-bar" role="img" aria-label="Пять шестых полного давления даёт воздух, одну шестую столб воды." />
  </div>;
}

function BrakeWork() {
  const x = distance => 53 + distance * 29;
  const y = energy => 155 - energy * 3;
  return <Diagram title="Кинетическая энергия тележки падает с 36 джоулей до нуля. Через 9 метров тележка останавливается." viewBox="0 0 360 210">
    <Axes x={53} y={155} right={336} top={28} ylabel="Eₖ, Дж" />
    <path d="M53 47L314 155H53Z" fill="#ede0f2" />
    <Arrow from={[x(0),y(36)]} to={[x(9),y(0)]} color={plum} />
    <path d={`M53 ${y(20)}H${x(4)}V155`} stroke={muted} strokeDasharray="4 4" fill="none" />
    <circle cx={x(4)} cy={y(20)} r="4" fill={ochre} />
    <text x="42" y={y(36)+6} textAnchor="end">36</text>
    <text x="42" y={y(20)+6} textAnchor="end">20</text>
    <text x={x(4)} y="181" textAnchor="middle">4</text><text x={x(9)} y="181" textAnchor="middle">9</text>
    <text x="280" y="111" textAnchor="middle" fill={plum}>−4 Дж/м</text>
    <text x="337" y="144" textAnchor="end">s, м</text>
  </Diagram>;
}

function OscillationBudget() {
  return <div className="lesson-oscillation-budget">
    <div className="lesson-oscillation-strip" role="img" aria-label="Из общей энергии 0,25 джоуля на энергию пружины приходится 0,09 джоуля, на кинетическую энергию 0,16 джоуля.">
      <span>36%</span><span>64%</span>
    </div>
    <dl>
      <div><dt>В пружине</dt><dd>0,09 Дж</dd></div>
      <div><dt>В движении</dt><dd>0,16 Дж</dd></div>
    </dl>
  </div>;
}

function FloatingBlock() {
  const [density, setDensity] = useState(600);
  const waterDensity = 1000;
  const submerged = Math.min(density / waterDensity, 1);
  const sinks = density > waterDensity;
  const side = 77;
  const waterline = 93;
  const top = waterline - side * (1 - submerged) + (sinks ? 22 : 0);
  const share = Math.round(100 * submerged);
  const status = sinks ? "Тонет" : density === waterDensity ? "Может оставаться в толще воды" : "Плавает";
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Брусок в воде. Плотность ${density} килограммов на кубометр. Под водой ${share} процентов объёма.`} viewBox="0 0 360 208">
      <rect x="34" y={waterline} width="292" height="105" rx="8" fill="#d7eaf0" />
      <text x="49" y="115" fill={teal}>Вода</text>
      <rect x="141.5" y={top} width={side} height={side} rx="3" fill="#f3cb8c" stroke={ochre} strokeWidth="2" />
      <rect x="142.5" y={top + side * (1 - submerged)} width={side - 2} height={side * submerged - 1} fill="#94b3c1" />
      <path d={`M34 ${waterline} H326`} stroke={teal} strokeWidth="2" strokeDasharray="5 4" />
      <path d="M34 81 V194 Q34 198 40 198 H320 Q326 198 326 194 V81" stroke={teal} strokeOpacity=".57" strokeWidth="2" fill="none" />
      {sinks && <Arrow from={[245,126]} to={[245,171]} color={plum} />}
    </Diagram>
    <div className="lesson-reflection-control">
      <span>Плотность бруска</span><output>{density} кг/м³</output>
      <Slider value={[density]} min={200} max={1200} step={50} onValueChange={([value]) => setDensity(value)}
        className="lesson-reflection-slider" thumbProps={{"aria-label":"Плотность бруска","aria-valuetext":`${density} кг/м³`}} />
      <p className="lesson-ray-reading" aria-live="polite">{status}. Под водой {share}% объёма.</p>
    </div>
  </div>;
}

function BalanceEdge() {
  const cases = [
    { pivot: [125, 127], angle: 26, label: "Вернётся", color: teal },
    { pivot: [285, 127], angle: 67, label: "Опрокинется", color: ochre },
  ];
  return <Diagram title="Ящик опирается на правый край. При малом наклоне центр тяжести остаётся слева от края и ящик вернётся. При большем наклоне центр тяжести справа от края и ящик опрокинется." viewBox="0 0 360 185">
    {cases.map(({pivot: [x, y], angle, label, color}) => {
      const radians = angle * Math.PI / 180;
      const center = [x - 34 * Math.cos(radians) + 25 * Math.sin(radians), y - 34 * Math.sin(radians) - 25 * Math.cos(radians)];
      return <g key={label}>
        <path d={`M${x - 91} ${y} H${x + 43}`} stroke={muted} strokeWidth="1.8" />
        <LessonProp name="wood-crate" x={x - 68} y={y - 50} width={68} height={50} fit="none"
          transform={`rotate(${angle} ${x} ${y})`} />
        <circle cx={x} cy={y} r="4" fill={ink} />
        <circle cx={center[0]} cy={center[1]} r="4.5" fill={color} />
        <Arrow from={center} to={[center[0], 149]} color={color} />
        <text x={x - 23} y="174" textAnchor="middle" fill={color}>{label}</text>
      </g>;
    })}
  </Diagram>;
}

function StaticFriction() {
  const [pull, setPull] = useState(4);
  const limit = 7;
  const sliding = pull > limit;
  const friction = sliding ? 5 : pull;
  const status = sliding ? "Брусок скользит" : pull === limit ? "На грани сдвига" : "Брусок стоит";
  const x = n => 54 + 19.5 * n;
  const y = n => 146 - 12.6 * n;
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`${status}. Тяга ${pull} ньютонов, модуль трения ${friction} ньютонов.`} viewBox="0 0 360 190">
      <Axes x={x(0)} y={y(0)} right={324} top={35} xlabel="Тяга, Н" ylabel="Трение, Н" />
      <path d={`M${x(0)} ${y(limit)}H${x(limit)}V${y(0)} M${x(0)} ${y(5)}H${x(limit)}`} fill="none" stroke={muted} strokeDasharray="4 4" />
      <path d={`M${x(0)} ${y(0)}L${x(limit)} ${y(limit)}`} stroke={plum} strokeWidth="3" />
      <path d={`M${x(limit)} ${y(5)}H${x(12)}`} stroke={teal} strokeWidth="3" />
      <circle cx={x(limit)} cy={y(limit)} r="4.5" fill={plum} />
      <circle cx={x(limit)} cy={y(5)} r="4" fill="#f3e9f6" stroke={teal} strokeWidth="1.8" />
      <circle cx={x(pull)} cy={y(friction)} r="5.8" fill="#efba74" stroke={ink} strokeWidth="1.6" />
      <text x="126" y="134" textAnchor="middle" fill={plum}>Покой</text>
      <text x="254" y="72" textAnchor="middle" fill={teal}>Скольжение</text>
      <text x={x(limit)} y="168" textAnchor="middle">7</text>
      <text x="42" y={y(limit)+5} textAnchor="end">7</text>
      <text x="42" y={y(5)+5} textAnchor="end">5</text>
    </Diagram>
    <div className="lesson-reflection-control">
      <span>Сила тяги</span><output>{pull} Н</output>
      <Slider value={[pull]} min={0} max={12} step={1} onValueChange={([value]) => setPull(value)}
        className="lesson-reflection-slider" thumbProps={{"aria-label":"Сила тяги","aria-valuetext":`${pull} Н`}} />
      <p className="lesson-ray-reading" aria-live="polite">{status}. Трение {friction} Н.</p>
    </div>
  </div>;
}

function CrateForces() {
  return <Diagram title="Две горизонтальные силы на ящик. Тяга 18 ньютонов вправо, сопротивление 6 ньютонов влево. Результирующая 12 ньютонов вправо." viewBox="0 0 360 186">
    <LessonProp name="wood-crate" x={115} y={54} width={70} height={58} fit="none" />
    <Arrow from={[150,82]} to={[300,82]} color={plum} outline="#fff8ed" />
    <Arrow from={[150,82]} to={[100,82]} color={ochre} outline="#fff8ed" />
    <circle cx="150" cy="82" r="3.5" fill={ink} />
    <text x="221" y="63" fill={plum}>18 Н</text><text x="99" y="66" textAnchor="end" fill={ochre}>6 Н</text>
    <Arrow from={[150,145]} to={[250,145]} color={teal} />
    <text x="200" y="173" textAnchor="middle" fill={teal}>Сумма 12 Н</text>
  </Diagram>;
}

function SpringMarks() {
  const drawSpring = (length, offset) => Array.from({length:15}, (_, index) => {
    const y = 41 + index * length / 14;
    const x = index === 0 || index === 14 ? offset : offset + (index % 2 ? -11 : 11);
    return `${x},${y}`;
  }).join(" ");
  return <Diagram title="Три одинаковые пружины. Первая без груза. Под грузом весом один ньютон удлинение 2 сантиметра, под грузом весом два ньютона удлинение 4 сантиметра." viewBox="0 0 360 229">
    <path d="M40 34H320" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    <path d="M33 103H326" stroke={muted} strokeDasharray="4 4" />
    {[{x:76,end:103,weight:0},{x:178,end:131,weight:1},{x:280,end:159,weight:2}].map(({x,end,weight}) => <g key={weight}>
      <path d={`M${x} 35V41`} stroke={ink} strokeWidth="2" />
      <polyline points={drawSpring(end - 41,x)} stroke={plum} strokeWidth="2.4" strokeLinejoin="round" fill="none" />
      {weight > 0 && <LessonProp name="brass-weight" x={x - (weight === 1 ? 12 : 17)} y={end - 1}
        width={weight === 1 ? 24 : 34} height={weight === 1 ? 26 : 36} />}
      <text x={x} y="204" textAnchor="middle">{weight ? `${weight} Н` : "Без груза"}</text>
      {weight > 0 && <text x={x} y="224" textAnchor="middle" fill={plum}>+{weight * 2} см</text>}
    </g>)}
  </Diagram>;
}

function ThirdLaw() {
  return <Diagram title="Земля тянет мяч вниз, мяч тянет Землю вверх. Стрелки равной длины приложены к разным телам." viewBox="0 0 360 181">
    <path d="M32 149Q180 69 328 149V181H32Z" fill="#c5ddd8" stroke={teal} strokeWidth="2" />
    <LessonProp name="orange-ball" x={159} y={32} width={42} height={42} />
    <Arrow from={[180,53]} to={[180,91]} color={plum} />
    <Arrow from={[180,148]} to={[180,110]} color={ochre} />
    <circle cx="180" cy="148" r="4" fill={ochre} />
    <text x="206" y="47" fill={ink}>Мяч</text>
    <text x="205" y="156" fill={ink}>Земля</text>
    <text x="161" y="87" textAnchor="end" fill={plum}>Сила на мяч</text>
    <text x="201" y="109" fill={ochre}>Сила на Землю</text>
  </Diagram>;
}

function StandingString() {
  const [mode, setMode] = useState(2);
  const left = 30, right = 330, middle = 85;
  const point = (t, sign) => [left + (right - left) * t, middle - sign * 39 * Math.sin(mode * Math.PI * t)];
  const nodeCount = ["Между концами нет узлов.", "Между концами один узел.", "Между концами два узла."][mode - 1];
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Крайние положения струны, закреплённой с двух концов. ${nodeCount}`} viewBox="0 0 360 155">
      <path d={`M${left} ${middle} H${right}`} stroke={muted} strokeDasharray="5 5" />
      <polyline points={curve(108, t => point(t, -1))} stroke="#aa8ab9" strokeDasharray="6 5" strokeWidth="2" fill="none" />
      <polyline points={curve(108, t => point(t, 1))} stroke={plum} strokeWidth="3" fill="none" />
      {Array.from({length:mode + 1}, (_, i) => <circle key={i} cx={point(i / mode, 1)[0]} cy={middle} r="4.5" fill={ochre} />)}
      <path d={`M${left} 66 V104 M${right} 66 V104`} stroke={ink} strokeWidth="4" strokeLinecap="round" />
      <text x="180" y="141" textAnchor="middle" fill={plum}>Крайние положения струны</text>
    </Diagram>
    <div className="lesson-wave-modes">
      <span>Полуволн</span>
      <ToggleGroup type="single" value={String(mode)} onValueChange={value => { if (value) setMode(Number(value)); }}
        aria-label="Число полуволн на струне" className="lesson-experiment-options">
        <ToggleGroupItem value="1" aria-label="1 полуволна">1</ToggleGroupItem>
        <ToggleGroupItem value="2" aria-label="2 полуволны">2</ToggleGroupItem>
        <ToggleGroupItem value="3" aria-label="3 полуволны">3</ToggleGroupItem>
      </ToggleGroup>
    </div>
    <p className="lesson-experiment-result" aria-live="polite">{nodeCount}</p>
  </div>;
}

function CrestIntervals() {
  const spacing = 65, start = 48, first = 79;
  const crests = Array.from({length:5}, (_, i) => start + i * spacing);
  const wave = curve(160, t => {
    const x = 28 + 300 * t;
    return [x, 101 - 22 * Math.cos((x - start) * 2 * Math.PI / spacing)];
  });
  return <Diagram title="Между первым и пятым гребнем четыре равных промежутка. Расстояние между соседними гребнями равно длине волны." viewBox="0 0 360 167">
    <path d="M29 101 H330" stroke={muted} strokeDasharray="4 5" />
    <polyline points={wave} stroke={plum} strokeWidth="3.2" fill="none" />
    {crests.map((x, i) => <g key={x}>
      <path d={`M${x} 52 V${first}`} stroke={muted} strokeDasharray="3 4" />
      <circle cx={x} cy={first} r="4" fill={ochre} />
      {i < crests.length - 1 && <text x={x+spacing/2} y="44" textAnchor="middle" fill={ochre}>λ</text>}
    </g>)}
    <path d="M48 48 V53 H308 V48" stroke={ochre} strokeWidth="1.8" fill="none" />
    <text x="178" y="149" textAnchor="middle" fill={plum}>Профиль в один момент</text>
  </Diagram>;
}

function ImpactPulse() {
  return <Diagram title="Две силы торможения дают равные по площади треугольники. При коротком ударе пик 40 ньютонов и длительность 0,20 секунды. При долгом пик 20 ньютонов и длительность 0,40 секунды. Каждая площадь равна 4 ньютон-секундам." viewBox="0 0 360 207">
    <Axes x={54} y={156} right={331} top={32} ylabel="|F|, Н" />
    <path d="M54 156L117 55L180 156Z" fill="#e4caed" stroke={plum} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M54 156L180 105.5L306 156Z" fill="#bcd9d7" fillOpacity=".55" stroke={teal} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M54 55H112 M54 105.5H175 M180 156V162 M306 156V162" fill="none" stroke={muted} strokeWidth="1.4" strokeDasharray="4 4" />
    <text x="44" y="60" textAnchor="end">40</text><text x="44" y="110" textAnchor="end">20</text>
    <text x="180" y="180" textAnchor="middle">0,20</text><text x="305" y="180" textAnchor="middle">0,40</text>
    <text x="331" y="143" textAnchor="end">t, с</text>
    <text x="132" y="49" fill={plum}>Короткий удар</text>
    <text x="199" y="105" fill={teal}>Долгий удар</text>
  </Diagram>;
}

function Flux() {
  const [angle, setAngle] = useState(0);
  const rad = angle * Math.PI / 180;
  const cosine = Math.cos(rad);
  const sine = Math.sin(rad);
  const flux = angle === 90 ? 0 : 10 * cosine;
  const x = 180, y = 92;
  const normal = length => [x + length*cosine, y - length*sine];
  const rim = length => [x + length*sine, y + length*cosine];
  const [labelX, labelY] = normal(81);
  const [endX, endY] = normal(32);
  const fluxWidth = Math.abs(flux) * 12;
  const reading = (flux > 0 ? "+" : flux < 0 ? "−" : "") + Math.abs(flux).toLocaleString("ru", { maximumFractionDigits: 2 });
  return <div className="lesson-figure-experiment lesson-flux" data-nodrag>
    <Diagram title={`Виток виден с ребра. Между нормалью и полем ${angle}°. Поток ${reading} мВб.`} viewBox="0 0 360 207">
      <g opacity=".62">
        {[56, 92, 128].map(height => <Arrow key={height} from={[31,height]} to={[327,height]} color={teal} />)}
      </g>
      <text x="323" y="39" textAnchor="end" fill={teal}>B</text>
      <path d={`M${rim(-54).join(" ")} L${rim(54).join(" ")}`} stroke={ink} strokeWidth="4" strokeLinecap="round" />
      {angle > 0 && <path d={`M${x+32} ${y} A32 32 0 0 0 ${endX} ${endY}`} stroke={ochre} strokeWidth="1.8" fill="none" />}
      <Arrow from={[x,y]} to={normal(65)} color={plum} />
      <text x={labelX} y={labelY+5} textAnchor="middle" fill={plum} fontStyle="italic">n</text>
      <rect x="60" y="168" width="240" height="12" rx="6" fill="#dbe5e8" />
      <rect x={flux < 0 ? x - fluxWidth : x} y="168" width={fluxWidth} height="12" rx="5" fill={flux < 0 ? "#c2875a" : "#9b80bd"} />
      <path d="M180 163v22" stroke={ink} strokeWidth="1.5" />
      <text x="60" y="201" textAnchor="middle">−10</text>
      <text x="180" y="201" textAnchor="middle">0</text>
      <text x="301" y="201" textAnchor="middle">+10 мВб</text>
    </Diagram>
    <div className="lesson-reflection-control">
      <span>Угол между полем и нормалью</span><output>{angle}°</output>
      <Slider value={[angle]} min={0} max={180} step={15} onValueChange={([value]) => setAngle(value)}
        className="lesson-reflection-slider" thumbProps={{"aria-label":"Угол между полем и нормалью","aria-valuetext":`${angle}°`}} />
      <p className="lesson-ray-reading" aria-live="polite">Поток {reading} мВб</p>
    </div>
  </div>;
}

const magnetMotion = {
  approach: { action: "Подношу", center: 79, field: "left", reading: "Ближний торец катушки становится северным." },
  still: { action: "Держу", center: 69, field: null, reading: "После затухания тока поле катушки исчезает." },
  recede: { action: "Отвожу", center: 59, field: "right", reading: "Ближний торец катушки становится южным." },
};

function MagnetCoil() {
  const [motion, setMotion] = useState("approach");
  const state = magnetMotion[motion];
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Северный полюс магнита обращён к замкнутой катушке. ${state.reading}`} viewBox="0 0 360 182">
      <path d="M168 92 Q149 100 151 116 V134 Q151 145 163 145 H304 Q317 145 317 133 V112 Q317 100 303 92"
        stroke="#9b5e40" strokeWidth="3" fill="none" />
      <LessonProp name="coil" x={167} y={54} width={137} height={58} fit="none" />
      <g transform={`translate(${state.center},0)`}>
        <LessonProp name="bar-magnet" x={-46} y={78} width={92} height={28} fit="none" transform="scale(-1 1)" />
        <text x="-21" y="99" textAnchor="middle" fill="#fff6ea">S</text><text x="23" y="99" textAnchor="middle" fill="#fff6ea">N</text>
      </g>
      <Arrow from={[179,39]} to={[284,39]} color={teal} />
      <text x="232" y="25" textAnchor="middle" fill={teal}>Поле магнита</text>
      {state.field && <>
        <path d="M208 93 H274" stroke="#2d2245" strokeOpacity=".85" strokeWidth="10" strokeLinecap="round" />
        <Arrow from={state.field === "left" ? [270,93] : [212,93]}
          to={state.field === "left" ? [212,93] : [270,93]} color="#ffdf9e" />
        <text x="232" y="166" textAnchor="middle" fill={plum}>Поле катушки</text>
      </>}
    </Diagram>
    <ToggleGroup type="single" value={motion} onValueChange={value => { if (value) setMotion(value); }}
      aria-label="Движение магнита" className="lesson-experiment-options magnet-controls">
      {Object.entries(magnetMotion).map(([value, state]) => <ToggleGroupItem key={value} value={value}>{state.action}</ToggleGroupItem>)}
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">{state.reading}</p>
  </div>;
}

function MovingLoop() {
  const [speed, setSpeed] = useState(1);
  const [distance, setDistance] = useState(15);
  const distanceId = useId();
  const field = .5, width = .2;
  const flux = field * width * distance / 100;
  const movingAcross = speed > 0 && distance > 0 && distance < 30;
  const voltage = movingAcross ? field * width * speed : 0;
  const x = distance === 0 ? 85 : distance === 30 ? 187 : 91 + 3 * distance;
  const format = value => value.toLocaleString("ru", { maximumFractionDigits:2 });
  return <div className="moving-loop" data-nodrag>
    <Diagram title={`Рамка входит в однородное поле, направленное за экран. В поле ${distance} см длины рамки. Поток ${format(flux*1000)} мВб. Модуль ЭДС ${format(voltage)} В.`} viewBox="0 0 340 155">
      <path d="M181 14H316V129H181Z" fill="#d9eaea" />
      <path d="M181 13V130" stroke={teal} strokeWidth="1.6" strokeDasharray="4 4" />
      {[203,227,251,275,299].map(x => [45,72,99].map(y =>
        <path key={x+"-"+y} d={`M${x-3} ${y-3}l6 6m0-6l-6 6`} stroke="#6e969e" strokeWidth="1.65" />))}
      <rect x={x} y="45" width="90" height="60" rx="5" fill="#ffe2c0" fillOpacity=".38" stroke="#674273" strokeWidth="3" />
      <path d={`M${x} 109v5 M${x+90} 109v5`} stroke={plum} strokeWidth="1.5" />
      {speed > 0 && <Arrow from={[x+16,34]} to={[x+74,34]} color={plum} />}
      <text x="305" y="30" textAnchor="end" fill={teal}>B</text>
      <text x="248" y="149" textAnchor="middle" fill={teal}>Область поля</text>
    </Diagram>
    <dl className="flux-readout" aria-live="polite">
      <div><dt>Поток через рамку</dt><dd>{format(flux*1000)} мВб</dd></div>
      <div><dt>Модуль ЭДС</dt><dd>{format(voltage)} В</dd></div>
    </dl>
    <ToggleGroup className="lesson-experiment-options loop-speed" aria-label="Скорость рамки"
      type="single" value={String(speed)} onValueChange={value => value && setSpeed(Number(value))}>
      <ToggleGroupItem value="0">Стоп</ToggleGroupItem>
      <ToggleGroupItem value="1">1 м/с</ToggleGroupItem>
      <ToggleGroupItem value="2">2 м/с</ToggleGroupItem>
    </ToggleGroup>
    <div className="lesson-reflection-control loop-position">
      <span id={distanceId}>Часть рамки в поле</span><output>{distance} см</output>
      <Slider className="lesson-reflection-slider" min={0} max={30} step={5} value={[distance]}
        onValueChange={([value]) => setDistance(value)} thumbProps={{ "aria-labelledby":distanceId,
          "aria-valuetext":distance + " см, ЭДС " + format(voltage) + " вольт" }} />
    </div>
  </div>;
}

function Melting() {
  const heatId = useId();
  const [step, setStep] = useState(0);
  const mass = 100;
  const heat = step * 4.2;
  const melted = mass * Math.min(1, Math.max(0, (step - 1) / 8));
  const ice = mass - melted;
  const temperature = step < 1 ? -20 : Math.max(0, (step - 9) * 10);
  const format = value => value.toLocaleString("ru");
  const tempLabel = format(temperature).replace("-", "−") + " °C";
  const heatLabel = format(heat) + " кДж";
  const xAt = index => 47 + index * 17;
  const yAt = temperature => 108 - temperature * 2.2;
  const x = xAt(step), y = yAt(temperature);
  return <div className="lesson-melting lesson-figure-experiment" data-nodrag>
    <header className="melting-header">
      <span>100 г льда при −20 °C</span>
      <div className="melting-thermometer">
        <img src="/art/lesson-plates/ice.webp" width="34" height="32" alt="" hidden={ice === 0} />
        <strong aria-label="Температура">{tempLabel}</strong>
      </div>
    </header>
    <Diagram title={`График нагревания. Подведено ${heatLabel}, температура ${tempLabel}, льда осталось ${format(ice)} грамма.`} viewBox="0 0 280 205">
      <path d={`M${xAt(1)} 172V108H${xAt(9)}V172Z`} fill="#f5dfbe" />
      <path d="M46 108H267" stroke={muted} strokeDasharray="4 4" />
      <Arrow from={[46,172]} to={[46,28]} color={ink} />
      <Arrow from={[46,172]} to={[267,172]} color={ink} />
      <text x="32" y="20" textAnchor="middle">t, °C</text>
      <text x="273" y="162" textAnchor="end">Q, кДж</text>
      {[-20, 0, 30].map(value => <text key={value} x="36" y={yAt(value) + 5} textAnchor="end">{String(value).replace("-", "−")}</text>)}
      {[1, 9].map(index => <text key={index} x={xAt(index)} y="197" textAnchor="middle">{format(index * 4.2)}</text>)}
      <path d={`M${xAt(0)} ${yAt(-20)}L${xAt(1)} 108H${xAt(9)}L${xAt(12)} ${yAt(30)}`} fill="none" stroke={teal} strokeWidth="3.4" strokeLinejoin="round" />
      <path d={`M${xAt(1)} 108H${xAt(9)}`} stroke={ochre} strokeWidth="4.3" strokeLinecap="round" />
      <path d={`M${x} ${y}V172`} stroke={plum} strokeDasharray="4 4" strokeWidth="1.7" />
      <circle cx={x} cy={y} r="6" fill="#fff6de" stroke={plum} strokeWidth="2.8" />
      <text x={xAt(5)} y="140" textAnchor="middle" fill="#72451c">Плавление</text>
    </Diagram>
    <div className="melting-mass">
      <div><span>Лёд <b>{format(ice)} г</b></span><span>Вода <b>{format(melted)} г</b></span></div>
      <span className="melting-mass-track" aria-hidden="true"><span style={{ width: ice + "%" }} /></span>
    </div>
    <div className="lesson-reflection-control melting-control">
      <span id={heatId}>Подведено тепла</span><output>{heatLabel}</output>
      <Slider className="lesson-reflection-slider" min={0} max={12} step={1} value={[step]}
        onValueChange={([value]) => setStep(value)}
        thumbProps={{ "aria-labelledby": heatId, "aria-valuetext": `${heatLabel}, ${tempLabel}, осталось ${format(ice)} г льда` }} />
    </div>
  </div>;
}

function ProcessBoundary() {
  return <div className="gas-boundary-compare">
    <div>
      <h3>Поршень закрепили</h3>
      <Diagram title="Границы газа остаются на местах. Теплота проходит снизу, поршень удерживают упоры." viewBox="0 0 142 143">
        <path d="M30 65H111V120H30Z" fill="#f5d2aa" />
        <LessonProp name="vapor-cylinder" x={27} y={33} width={87} height={90} fit="none" />
        <LessonProp name="brass-plunger" x={28} y={29} width={85} height={36} fit="none" />
        <path d="M25 52H35V63 M116 52H106V63" stroke={plum} strokeWidth="3" fill="none" />
        <Arrow from={[71,137]} to={[71,104]} color={ochre} />
        <text x="84" y="138" fill={ochre}>Q</text>
        {[41,58,96,79].map((x,i)=><circle key={x} cx={x} cy={80+(i%2)*15} r="3.4" fill="#a16b57" />)}
      </Diagram>
      <p>Теплота входит. Объём прежний.</p>
      <p className="process-equations"><Rich text="$A=0$" /><Rich text={"$\\Delta U=Q$"} /></p>
    </div>
    <div>
      <h3>Цилиндр укутали</h3>
      <Diagram title="Границы теплоизолированы. Газ передвигает поршень вверх от отмеченного пунктиром исходного положения." viewBox="0 0 142 143">
        <path d="M18 35V126H123V35" fill="none" stroke="#96a8c3" strokeWidth="10" strokeLinejoin="round" />
        <path d="M30 40H111V118H30Z" fill="#d5e7ef" />
        <LessonProp name="vapor-cylinder" x={27} y={29} width={87} height={94} fit="none" />
        <LessonProp name="brass-plunger" x={28} y={4} width={85} height={36} fit="none" />
        <path d="M28 73H113" stroke="#6e6487" strokeDasharray="4 4" strokeWidth="1.6" />
        <Arrow from={[71,69]} to={[71,17]} color={teal} />
        <text x="82" y="20" fill={teal}>A</text>
        {[41,58,96,79].map((x,i)=><circle key={x} cx={x} cy={63+(i%2)*33} r="3.4" fill="#577c87" />)}
      </Diagram>
      <p>Газ поднимает поршень и остывает.</p>
      <p className="process-equations"><Rich text="$Q=0$" /><Rich text={"$\\Delta U=-A$"} /></p>
    </div>
  </div>;
}

function DewPoint() {
  return <Diagram title="При охлаждении давление водяного пара почти постоянно до точки росы. В ней оно сравнивается с давлением насыщенного пара. Ниже точки росы часть пара конденсируется." viewBox="0 0 360 201">
    <Axes x={49} y={147} right={334} top={34} xlabel="T" ylabel="p" />
    <path d="M50 135 Q118 124 173 90 Q220 61 245 26" fill="none" stroke={teal} strokeWidth="3.2" strokeLinecap="round" />
    <path d="M173 90 V147" fill="none" stroke={muted} strokeDasharray="4 5" />
    <Arrow from={[321,90]} to={[174,90]} color={ochre} />
    <circle cx="173" cy="90" r="5" fill={plum} />
    <text x="324" y="79" textAnchor="end" fill={ochre}>Охлаждаем</text>
    <text x="303" y="20" textAnchor="end" fill={teal}>Насыщенный пар</text>
    <text x="173" y="171" textAnchor="middle" fill={plum}>Точка росы</text>
  </Diagram>;
}

const saturationByTemperature = { 5: 6.8, 10: 9.4, 15: 12.8, 20: 17.2, 25: 23 };
const vaporDots = [[102,66],[127,90],[160,54],[171,102],[206,78],[227,112],[256,64],[119,128],[155,132],[206,137],[242,95],[106,101],[188,62],[253,135],[190,118],[231,52]];

function CoolingJar() {
  const [temperature, setTemperature] = useState(25);
  const total = 12.8;
  const saturation = saturationByTemperature[temperature];
  const vapor = Math.min(total, saturation);
  const liquid = total - vapor;
  const percent = Math.round(vapor / saturation * 100);
  const format = value => Number(value.toFixed(1)).toLocaleString("ru");
  const phase = liquid > 0 ? "Часть воды сконденсировалась" : vapor === saturation ? "Пар достиг насыщения" : "Пар ещё ненасыщенный";
  return <div className="lesson-figure-experiment lesson-cooling" data-nodrag>
    <Diagram title={`Литровая банка при ${temperature} °C. Пар ${format(vapor)} мг, конденсат ${format(liquid)} мг.`} viewBox="0 0 360 184">
      <LessonProp name="glass-jar" x={72} y={16} width={216} height={151} fit="none" />
      {vaporDots.slice(0, Math.round(vapor / total * vaporDots.length)).map(([x,y]) =>
        <circle key={`${x},${y}`} cx={x} cy={y} r="2.2" fill={plum} />)}
      {liquid > 0 && <g fill="#629aa5" opacity=".92">
        <path d="M107 111c4 7 4 9 0 10c-5 0-4-4 0-10 M256 82c5 7 5 10 0 10c-5 0-5-4 0-10 M263 113c5 7 5 10 0 10c-5 0-5-4 0-10" />
      </g>}
    </Diagram>
    <div className="lesson-reflection-control">
      <span>Температура в сосуде</span><output>{temperature} °C</output>
      <Slider value={[temperature]} min={5} max={25} step={5} onValueChange={([value]) => setTemperature(value)}
        className="lesson-reflection-slider" thumbProps={{"aria-label":"Температура в сосуде","aria-valuetext":`${temperature} °C`}} />
    </div>
    <div className="lesson-cooling-bar" aria-hidden="true"><span style={{width:`${vapor / total * 100}%`}} /></div>
    <dl className="lesson-cooling-values" aria-label="Масса воды в сосуде">
      <div><dt>Пар</dt><dd>{format(vapor)} мг</dd></div>
      <div><dt>Конденсат</dt><dd>{format(liquid)} мг</dd></div>
    </dl>
    <p className="lesson-experiment-result" aria-live="polite">{phase}. Влажность {percent}%.</p>
  </div>;
}

function CondensateMass() {
  return <Diagram title="До охлаждения все 60 граммов воды были паром. После охлаждения 40 граммов остались паром и 20 граммов сконденсировались." viewBox="0 0 360 193">
    <text x="24" y="27">До охлаждения</text>
    <rect x="24" y="42" width="312" height="34" rx="10" fill="#dfcfea" />
    <text x="180" y="64" textAnchor="middle" fill={plum}>60 г пара</text>
    <text x="24" y="114">После охлаждения</text>
    <rect x="24" y="129" width="312" height="34" rx="10" fill="#dfcfea" />
    <path d="M232 129H326Q336 129 336 139V153Q336 163 326 163H232Z" fill="#accfd4" />
    <text x="128" y="151" textAnchor="middle" fill={plum}>40 г пара</text>
    <text x="284" y="151" textAnchor="middle" fill={teal}>20 г воды</text>
  </Diagram>;
}

function IceRemaining() {
  const start = 28, width = 304, melted = start + width * .75;
  return <Diagram title="Из 100 граммов льда 75 граммов растаяли, 25 граммов остались твёрдыми." viewBox="0 0 360 147">
    <text x="180" y="26" textAnchor="middle">100 г льда в начале</text>
    <rect x={start} y="51" width={width} height="41" rx="9" fill="#ded0ed" />
    <path d={`M${melted} 51 H37 Q28 51 28 60 V83 Q28 92 37 92 H${melted}Z`} fill="#bddbd8" />
    <path d={`M${melted} 51 V92`} stroke={ink} strokeOpacity=".52" />
    <text x="142" y="78" textAnchor="middle" fill={teal}>75 г</text>
    <text x="294" y="78" textAnchor="middle" fill={plum}>25 г</text>
    <text x="142" y="118" textAnchor="middle" fill={teal}>Растаяли</text>
    <text x="294" y="118" textAnchor="middle" fill={plum}>Остались</text>
  </Diagram>;
}

function GasPiston() {
  return <div className="piston-reading">
    <p>Объём одной порции газа</p>
    <dl>
      <div><dt>До сжатия</dt><dd><span aria-hidden="true" /><Rich text="$V$" /></dd></div>
      <div><dt>После</dt><dd><span aria-hidden="true" /><Rich text="$V/2$" /></dd></div>
    </dl>
  </div>;
}

function WallCollision() {
  return <Diagram title="Молекула упруго отражается от гладкой вертикальной стенки. Горизонтальная составляющая её скорости меняет знак, вертикальная сохраняется. Стенка получает импульс вправо." viewBox="0 0 360 228">
    <path d="M236 26H257V197H236Z" fill="#d0dce8" />
    <path d="M236 26V197 M238 43l18-14m-18 39 18-14m-18 39 18-14m-18 39 18-14m-18 39 18-14m-18 39 18-14m-18 39 18-14" fill="none" stroke={muted} strokeWidth="1.5" />
    <path d="M73 173L236 112L73 51" fill="none" stroke={muted} strokeWidth="1.5" strokeDasharray="4 5" />
    <circle cx="111" cy="159" r="5.5" fill={ochre} />
    <circle cx="167" cy="86" r="5.5" fill={teal} />
    <Arrow from={[119,156]} to={[187,131]} color={ochre} />
    <Arrow from={[159,83]} to={[91,58]} color={teal} />
    <Arrow from={[258,112]} to={[328,112]} color={plum} />
    <text x="137" y="189" textAnchor="middle" fill={ochre}>Подлетает</text>
    <text x="133" y="45" textAnchor="middle" fill={teal}>Отлетает</text>
    <text x="301" y="92" textAnchor="middle" fill={plum}>Импульс</text>
    <text x="301" y="136" textAnchor="middle" fill={plum}>стенке</text>
    <text x="246" y="216" textAnchor="middle">Стенка</text>
  </Diagram>;
}

function Echo() {
  return <Diagram title="Звук проходит от источника до стены и обратно. Полное время 0,5 секунды." viewBox="0 0 360 180">
    <LessonProp name="brass-speaker" x={40} y={55} width={72} height={64} fit="none" />
    <path d="M303 32V131 M304 47l12-12m-12 31 12-12m-12 31 12-12m-12 31 12-12m-12 31 12-12" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
    <Arrow from={[124,75]} to={[284,75]} color={ochre} />
    <Arrow from={[284,106]} to={[124,106]} color={teal} />
    <text x="206" y="61" textAnchor="middle" fill={ochre}>К стене</text>
    <text x="206" y="128" textAnchor="middle" fill={teal}>Обратно</text>
    <text x="180" y="158" textAnchor="middle">Весь путь: 0,5 с</text>
  </Diagram>;
}

const gasWorkPaths = {
  expansion: { from:[151,83], to:[250,83], description:"Расширение от 2 до 4 литров при 100 килопаскалях", work:"+200" },
  compression: { from:[250,83], to:[151,83], description:"Сжатие от 4 до 2 литров при 100 килопаскалях", work:"−200" },
  heating: { from:[151,83], to:[151,50], description:"Нагрев при постоянном объёме 2 литра, давление от 100 до 140 килопаскалей", work:"0" },
};

function GasWork() {
  const [path, setPath] = useState("expansion");
  const {from, to, description, work} = gasWorkPaths[path];
  const heating = path === "heating";
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`${description}. Работа газа ${work} джоулей.`} viewBox="0 0 360 207">
      <Axes x={52} y={166} right={326} top={30} xlabel="V, л" ylabel="p, кПа" />
      {heating ? <>
        <path d="M52 50H151 M151 83V166" stroke={muted} strokeDasharray="4 5" fill="none" />
        <text x="43" y="55" textAnchor="end">140</text>
      </> : <>
        <path d="M151 83H250V166H151Z" fill={path === "expansion" ? "#e4c9ed" : "#c8dde3"} />
        <path d="M250 83V166 M151 83V166" stroke={muted} strokeDasharray="4 5" fill="none" />
        <text x="250" y="190" textAnchor="middle">4</text>
        <text x="200" y="129" fill={plum} fontWeight="650" textAnchor="middle">{work} Дж</text>
      </>}
      <path d="M52 83H151" stroke={muted} strokeDasharray="4 5" fill="none" />
      <text x="43" y="88" textAnchor="end">100</text>
      <text x="151" y="190" textAnchor="middle">2</text>
      <Arrow from={from} to={to} color={plum} />
    </Diagram>
    <ToggleGroup type="single" value={path} onValueChange={value => value && setPath(value)}
      className="lesson-experiment-options" aria-label="Процесс с газом">
      <ToggleGroupItem value="expansion">Расширить</ToggleGroupItem>
      <ToggleGroupItem value="compression">Сжать</ToggleGroupItem>
      <ToggleGroupItem value="heating">Закрепить</ToggleGroupItem>
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">Работа газа {work} Дж</p>
  </div>;
}

function IsochoricHeating() {
  return <div className="isochoric-reading">
    <p>Объём постоянный. Количество газа прежнее.</p>
    <Diagram title="График давления в зависимости от абсолютной температуры при постоянном объёме. При 300 кельвинах давление 80 килопаскалей, при 450 кельвинах 120 килопаскалей." viewBox="20 6 324 180">
    <Axes x={51} y={151} right={334} top={29} xlabel="T, К" ylabel="p, кПа" />
    <path d="M51 151L201 87" fill="none" stroke={muted} strokeWidth="2.4" strokeDasharray="5 5" />
    <path d="M51 87H201V151 M51 55H276V151" fill="none" stroke={muted} strokeDasharray="4 5" />
    <Arrow from={[201,87]} to={[276,55]} color={plum} />
    <circle cx="201" cy="87" r="4.4" fill={ochre} /><circle cx="276" cy="55" r="4.4" fill={plum} />
    <text x="42" y="92" textAnchor="end">80</text><text x="42" y="60" textAnchor="end">120</text>
    <text x="201" y="175" textAnchor="middle">300</text><text x="276" y="175" textAnchor="middle">450</text>
    </Diagram>
  </div>;
}

function HeatingStages() {
  const stages = [
    { title:"Нагреть лёд", energy:2.1, label:"2,1", color:"#ad92c8" },
    { title:"Растопить лёд", energy:33, label:"33", color:"#85b9bc" },
    { title:"Нагреть воду", energy:42, label:"42", color:"#d9ac78" },
    { title:"Испарить воду", energy:230, label:"230", color:"#ac7da3" },
  ];
  return <Diagram title="В расчёте четыре этапа. Нагрев льда 2,1 килоджоуля, плавление 33, нагрев воды 42, превращение воды в пар 230. Сумма 307,1 килоджоуля." viewBox="0 0 360 247">
    <text x="331" y="22" textAnchor="end" fill={plum}>Теплота, кДж</text>
    {stages.map(({title,energy,label,color},index) => {
      const y = 48 + index * 49;
      return <g key={title}>
        <text x="28" y={y}>{title}</text>
        <text x="331" y={y} textAnchor="end" fontWeight="650">{label}</text>
        <path d={`M28 ${y+13}H331`} stroke="#e6dbe9" strokeWidth="7" />
        <path d={`M28 ${y+13}h${303 * energy / 230}`} stroke={color} strokeWidth="7" />
      </g>;
    })}
  </Diagram>;
}

function GasWorkRamp({ figure }) {
  const [[v1, p1], [v2, p2]] = figure.points ?? [[2, 100], [6, 300]];
  const x0 = 63, y0 = 164, x2 = 279, y2 = 50;
  const x1 = x0 + (x2 - x0) * v1 / v2;
  const y1 = y0 - (y0 - y2) * p1 / p2;
  return <Diagram title={`Давление линейно растёт от ${p1} до ${p2} кПа, объём — от ${v1} до ${v2} л.`} viewBox="0 0 360 207">
    <Axes x={x0} y={y0} right={331} xlabel="V, л" ylabel="p, кПа" />
    <path d={`M${x1} ${y1}L${x2} ${y2}V${y0}H${x1}Z`} fill="#d7c1e8" />
    <path d={`M${x0} ${y1}H${x1}V${y0} M${x0} ${y2}H${x2}V${y0}`} fill="none" stroke={muted} strokeDasharray="4 5" />
    <Arrow from={[x1,y1]} to={[x2,y2]} color={plum} />
    <text x="53" y={y1 + 5} textAnchor="end">{p1}</text>
    <text x="53" y={y2 + 5} textAnchor="end">{p2}</text>
    <text x={x1} y="187" textAnchor="middle">{v1}</text><text x={x2} y="187" textAnchor="middle">{v2}</text>
  </Diagram>;
}

const gasCoordinates = [
  {id:"pv", label:"p(V)", xlabel:"V", ylabel:"p", paths:["M52 63H312","M170 28V163",null]},
  {id:"pt", label:"p(T)", xlabel:"T", ylabel:"p", paths:["M71 63H312","M79 147L270 32","M170 28V151"], extension:"M52 163L79 147"},
  {id:"vt", label:"V(T)", xlabel:"T", ylabel:"V", paths:["M79 147L270 32","M71 63H312","M170 28V151"], extension:"M52 163L79 147"},
];
const gasProcesses = [
  {name:"Изобара", constant:"p", color:"#935921"},
  {name:"Изохора", constant:"V", color:"#356e70"},
  {name:"Изотерма", constant:"T", color:"#77519a"},
];

function GasCoordinates() {
  const [coordinateId, setCoordinateId] = useState("pv");
  const coordinates = gasCoordinates.find(item => item.id === coordinateId);
  const isotherm = curve(64,t => {
    const volume = .55 + 2.08*t;
    return [52+99*volume,163-72/volume];
  });
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Три газовых процесса в координатах ${coordinates.label}.`} viewBox="0 0 360 193">
      <Axes xlabel={coordinates.xlabel} ylabel={coordinates.ylabel} />
      {gasProcesses.map(({name,color},i) => coordinates.paths[i]
        ? <path key={name} d={coordinates.paths[i]} stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
        : <polyline key={name} points={isotherm} stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />)}
      {coordinates.extension && <path d={coordinates.extension} stroke={coordinates.id === "pt" ? teal : ochre} strokeWidth="2.3" strokeDasharray="3 4" />}
    </Diagram>
    <ul className="lesson-gas-legend">
      {gasProcesses.map(({name,constant,color}) => <li key={name} style={{"--gas-curve":color}}>{name}, {constant} постоянно</li>)}
    </ul>
    <ToggleGroup type="single" value={coordinateId} onValueChange={value => { if(value) setCoordinateId(value); }}
      aria-label="Координаты графика" className="lesson-experiment-options">
      {gasCoordinates.map(({id,label}) => <ToggleGroupItem key={id} value={id}>{label}</ToggleGroupItem>)}
    </ToggleGroup>
  </div>;
}

function MixedCircuit() {
  return <Diagram title="Резистор 4 ома последовательно с парой параллельных резисторов 6 и 3 ома. Источник 12 вольт." viewBox="0 0 360 200">
    <g fill="none" stroke={ink} strokeWidth="2.5" strokeLinejoin="round">
      <path d="M34 106V55H89 M135 55H176V29H219 M268 29H309V147H188 M167 147H34V106 M176 55V87H219 M268 87H309V55" />
      <rect x="89" y="45" width="46" height="20" rx="2" />
      <rect x="219" y="19" width="49" height="20" rx="2" />
      <rect x="219" y="77" width="49" height="20" rx="2" />
      <path d="M167 134V160 M188 140V154" />
    </g>
    <text x="112" y="36" textAnchor="middle">4 Ом</text>
    <text x="244" y="60" textAnchor="middle">6 Ом</text>
    <text x="244" y="120" textAnchor="middle">3 Ом</text>
    <text x="178" y="181" textAnchor="middle">12 В</text>
    <circle cx="176" cy="55" r="4" fill={plum} /><circle cx="309" cy="55" r="4" fill={plum} />
  </Diagram>;
}

function PointField() {
  return <Diagram title="Положительный точечный источник. Слева, справа и сверху от него напряжённость направлена от заряда." viewBox="0 0 360 212">
    {[0,45,90,135,180,225,270,315].map(angle => {
      const r = angle * Math.PI / 180;
      const point = d => [180 + d * Math.cos(r), 104 + d * Math.sin(r)];
      return <Arrow key={angle} from={point(39)} to={point(78)} color={angle % 90 ? muted : plum} />;
    })}
    <circle cx="180" cy="104" r="25" fill="#f6c9b5" />
    <text x="180" y="112" textAnchor="middle" fill={ochre} fontSize="27" fontWeight="650">+</text>
    <text x="180" y="203" textAnchor="middle">Положительный источник</text>
  </Diagram>;
}

function ProbeCharge() {
  const [sign, setSign] = useState("positive");
  const positive = sign === "positive";
  const direction = positive ? "вправо" : "влево";
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Поле направлено вправо. Сила на ${positive ? "положительный" : "отрицательный"} заряд направлена ${direction}.`} viewBox="0 0 360 169">
      <rect x="24" y="14" width="312" height="138" rx="18" fill="#edf3f5" />
      <Arrow from={[42,45]} to={[105,45]} color={teal} />
      <Arrow from={[141,45]} to={[204,45]} color={teal} />
      <Arrow from={[240,45]} to={[303,45]} color={teal} />
      <text x="319" y="50" textAnchor="middle" fill={teal}>E</text>
      <circle cx="180" cy="103" r="21" fill={positive ? "#f4cfac" : "#e2d4ef"} stroke={plum} strokeWidth="1.5" />
      <text x="180" y="110" textAnchor="middle" fontSize="23" fill={ink} fontWeight="650">{positive ? "+" : "−"}</text>
      <Arrow from={[positive ? 206 : 154,103]} to={[positive ? 282 : 78,103]} color={plum} />
      <text x={positive ? 244 : 116} y="130" textAnchor="middle" fill={plum}>Сила F</text>
    </Diagram>
    <ToggleGroup type="single" value={sign} onValueChange={value => value && setSign(value)}
      className="lesson-experiment-options" aria-label="Знак пробного заряда">
      <ToggleGroupItem value="positive">+2 мкКл</ToggleGroupItem>
      <ToggleGroupItem value="negative">−2 мкКл</ToggleGroupItem>
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">4 мН {direction}</p>
  </div>;
}

const sumSources = [
  { field: [300, 0], fill: "#f1d2b3", ink: "#87532d" },
  { field: [0, 400], fill: "#cce8de", ink: "#336a68" },
];
const fieldPoint = [151, 112];
const fieldVector = (start, [x, y]) => [start[0] + x * .19, start[1] - y * .19];

function FieldAddition() {
  const [step, setStep] = useState("left");
  const showLower = step !== "left";
  const showSum = step === "sum";
  const [a, b] = sumSources;
  const first = fieldVector(fieldPoint, a.field);
  const second = fieldVector(fieldPoint, b.field);
  const total = a.field.map((value, index) => value + b.field[index]);
  const end = fieldVector(fieldPoint, total);
  const magnitude = Math.hypot(...total);
  const reading = showSum ? `Суммарное поле ${magnitude} Н/Кл, вправо и вверх.`
    : showLower ? "От нижнего заряда поле в P направлено вверх." : "От левого заряда поле в P направлено вправо.";

  return <section className="field-addition" aria-label="Поле двух зарядов в точке P" data-nodrag>
    <div className="field-number-pair">
      <span><i />Слева <b>{a.field[0]} Н/Кл</b></span>
      <span data-pending={!showLower || undefined}><i />Снизу <b>{showLower ? b.field[1] + " Н/Кл" : "—"}</b></span>
    </div>
    <Diagram title={reading} viewBox="0 0 303 224">
      <path d="M56 112H148M151 115V190" stroke="#bea9bb" strokeWidth="1.4" strokeDasharray="4 5" fill="none" />
      <circle cx="55" cy="112" r="17" fill={a.fill} />
      <text x="55" y="118" textAnchor="middle" fill={a.ink} fontSize="20" fontWeight="700">+</text>
      <circle cx="151" cy="207" r="15" fill={b.fill} opacity={showLower ? 1 : .43} />
      <text x="151" y="213" textAnchor="middle" fill={b.ink} opacity={showLower ? 1 : .6} fontSize="20" fontWeight="700">+</text>
      <circle cx={fieldPoint[0]} cy={fieldPoint[1]} r="4" fill="#624770" />
      <text x="132" y="131" fill="#624770" fontSize="18">P</text>
      {showSum && <path d={`M${first.join(" ")}L${end.join(" ")}L${second.join(" ")}`} stroke="#718587" strokeWidth="1.6" strokeDasharray="5 4" fill="none" />}
      <Arrow from={fieldPoint} to={first} color={a.ink} />
      {showLower && <Arrow from={fieldPoint} to={second} color={b.ink} />}
      {showSum && <Arrow from={fieldPoint} to={end} color="#725187" />}
      <text x="213" y="119" fill={a.ink}>E₁</text>
      {showLower && <text x="142" y="26" fill={b.ink}>E₂</text>}
      {showSum && <text x="217" y="33" fill="#725187">E</text>}
    </Diagram>
    <ToggleGroup type="single" className="lesson-experiment-options field-addition-steps" value={step} onValueChange={value => value && setStep(value)}
      aria-label="Построение поля">
      <ToggleGroupItem value="left">Левый</ToggleGroupItem>
      <ToggleGroupItem value="both">Оба</ToggleGroupItem>
      <ToggleGroupItem value="sum">Сумма</ToggleGroupItem>
    </ToggleGroup>
    <p className="field-addition-result" role="status">{reading}</p>
  </section>;
}

function SuspendedCharge() {
  return <Diagram title="На положительный заряд действуют две равные силы: электрическая вверх, тяжесть вниз. Поле направлено вверх." viewBox="0 0 360 203">
    <Arrow from={[137,98]} to={[137,36]} color={plum} />
    <Arrow from={[137,98]} to={[137,160]} color={ochre} />
    <circle cx="137" cy="98" r="15" fill="#f4cfac" stroke={plum} strokeWidth="1.6" />
    <text x="137" y="104" textAnchor="middle" fontWeight="650">+</text>
    <text x="119" y="42" textAnchor="end" fill={plum}>Fₑ</text>
    <text x="119" y="165" textAnchor="end" fill={ochre}>mg</text>
    <Arrow from={[249,129]} to={[249,66]} color={teal} />
    <text x="267" y="97" fill={teal}>Поле E</text>
  </Diagram>;
}

function Potential() {
  const a = [89,74], b = [272,144];
  return <Diagram title="Однородное поле направлено вправо. Прямой и обходной пути соединяют одни и те же точки 1 и 2." viewBox="0 0 360 210">
    <path d="M89 53V172 M272 53V172" stroke={muted} strokeDasharray="4 5" />
    <Arrow from={[123,34]} to={[235,34]} color={teal} />
    <text x="253" y="39" fill={teal}>E</text>
    <path d="M89 74 C179 22 258 70 272 144" fill="none" stroke={ochre} strokeWidth="3" strokeDasharray="6 5" strokeLinecap="round" />
    <path d="M89 74L272 144" fill="none" stroke={plum} strokeWidth="3" />
    {[a,b].map(([x,y],i) => <g key={x}>
      <circle cx={x} cy={y} r="13" fill="#fcf8fc" stroke={plum} strokeWidth="2" />
      <text x={x} y={y + 5} textAnchor="middle" fill={plum} fontWeight="650">{i + 1}</text>
    </g>)}
    <text x="89" y="196" textAnchor="middle">φ₁</text>
    <text x="272" y="196" textAnchor="middle">φ₂</text>
  </Diagram>;
}

const routePaths = {
  direct: [[62,125],[166,125],[270,125]],
  detour: [[62,125],[62,56],[166,56],[270,56],[270,125]],
};

function PotentialRoutes() {
  const [route, setRoute] = useState("direct");
  const [step, setStep] = useState(0);
  const points = routePaths[route];
  const arrived = step === points.length - 1;
  const start = routePaths.direct[0];
  const finish = routePaths.direct.at(-1);
  const dot = points[step];
  const potential = 90 - 30 * (dot[0] - start[0]) / (166 - start[0]);
  const work = 2 * (90 - potential);
  return <div className="potential-route-experiment" data-nodrag>
    <Diagram title={"Заряд на линии " + potential + " вольт. Работа поля от старта " + work + " микроджоулей."} viewBox="0 0 330 177">
      <path d="M62 30V142 M166 30V142 M270 30V142" stroke="#a789aa" strokeDasharray="3 4" />
      <Arrow from={[112,25]} to={[206,25]} color={teal} />
      <text x="225" y="30" fill={teal}>E</text>
      {Object.entries(routePaths).map(([key, path]) => <polyline key={key}
        points={path.map(pair => pair.join(",")).join(" ")} fill="none" stroke={key === route ? "#a96b45" : "#ad9aad"}
        strokeWidth={key === route ? 2.6 : 1.5} strokeDasharray="4 5" strokeLinejoin="round" />)}
      <polyline points={points.slice(0, step + 1).map(pair => pair.join(",")).join(" ")}
        fill="none" stroke="#a96b45" strokeWidth="4" strokeLinejoin="round" />
      {points.slice(1, -1).map(([x,y]) => <circle key={x + "-" + y} cx={x} cy={y} r="3" fill="#a96b45" />)}
      <circle cx={start[0]} cy={start[1]} r="4" fill={muted} />
      <circle cx={finish[0]} cy={finish[1]} r="5" fill="#fff7ef" stroke={plum} strokeWidth="1.7" />
      <circle cx={dot[0]} cy={dot[1]} r="8" fill="#f4c187" stroke="#7f4d39" strokeWidth="2.1" />
      <text x="62" y="164" textAnchor="middle">90 В</text>
      <text x="166" y="164" textAnchor="middle">60 В</text>
      <text x="270" y="164" textAnchor="middle">30 В</text>
    </Diagram>
    <dl className="potential-road-readings" aria-live="polite">
      <div><dt>Потенциал в точке</dt><dd>{potential} В</dd></div>
      <div><dt>Работа поля от старта</dt><dd>{work} мкДж</dd></div>
    </dl>
    <div className="potential-route-control">
      <ToggleGroup type="single" value={route} onValueChange={value => { if (value) { setRoute(value); setStep(0); } }}
        className="lesson-experiment-options" aria-label="Маршрут заряда">
        <ToggleGroupItem value="direct">Напрямую</ToggleGroupItem><ToggleGroupItem value="detour">В обход</ToggleGroupItem>
      </ToggleGroup>
      <Button type="button" variant="secondary" className="potential-route-go" onClick={() => setStep(arrived ? 0 : step + 1)}>
        {arrived ? "На старт" : "К следующей точке"}
      </Button>
    </div>
  </div>;
}

const potentialDestinations = {
  left: { x: 79, y: 123, potential: 90 },
  up: { x: 180, y: 53, potential: 60 },
  right: { x: 281, y: 123, potential: 30 },
};

function EquipotentialMove() {
  const [destination, setDestination] = useState("up");
  const {x, y, potential} = potentialDestinations[destination];
  const work = 2 * (60 - potential);
  const workLabel = work > 0 ? `+${work}` : String(work).replace("-", "−");
  const start = [180, 123];
  const tip = [x + 9 * Math.sign(start[0] - x), y + 9 * Math.sign(start[1] - y)];
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Потенциал убывает вправо. Старт 60 вольт, финиш ${potential} вольт. Работа поля ${workLabel} микроджоулей.`} viewBox="0 0 360 209">
      <rect x="36" y="31" width="288" height="140" rx="17" fill="#e4e8f3" />
      {Object.values(potentialDestinations).map(line => <g key={line.x}>
        <path d={`M${line.x} 35V158`} stroke={muted} strokeWidth="1.6" strokeDasharray="4 5" />
        <text x={line.x} y="188" textAnchor="middle">{line.potential} В</text>
      </g>)}
      <Arrow from={[98,17]} to={[245,17]} color={teal} />
      <text x="259" y="23" fill={teal}>E</text>
      <Arrow from={start} to={tip} color={plum} />
      <circle cx={start[0]} cy={start[1]} r="5" fill={ink} />
      <circle cx={x} cy={y} r="5.5" fill="#f4be7d" stroke={plum} strokeWidth="1.6" />
    </Diagram>
    <ToggleGroup type="single" value={destination} onValueChange={value => value && setDestination(value)}
      className="lesson-experiment-options" aria-label="Куда перенести заряд">
      <ToggleGroupItem value="left">Влево</ToggleGroupItem>
      <ToggleGroupItem value="up">Вверх</ToggleGroupItem>
      <ToggleGroupItem value="right">Вправо</ToggleGroupItem>
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">Работа поля {workLabel} мкДж</p>
  </div>;
}

function PlateGap() {
  const [isolatedCharge, setIsolatedCharge] = useState(null);
  const [gap, setGap] = useState(1);
  const connected = isolatedCharge === null;
  const capacitance = 2 / gap;
  const charge = isolatedCharge ?? 6 * capacitance;
  const voltage = charge / capacitance;
  const left = 180 - 32 * gap, right = 180 + 32 * gap;
  const markCount = Math.round(charge / 2);
  const signs = Array.from({length:markCount}, (_,i) => 86 + (i - (markCount - 1) / 2) * 14);
  const label = value => Number(value.toFixed(2)).toLocaleString("ru");
  const gapLabel = label(gap);
  const fixed = connected ? "Источник удерживает 6 В." : "На каждой пластине сохраняется заряд по модулю " + label(charge) + " нКл.";
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Две пластины конденсатора. Зазор ${gapLabel} миллиметра. ${fixed}`} viewBox="0 0 360 187">
      <rect x={left} y="38" width={right-left} height="94" fill="#f7e6c5" />
      <path d={`M${left} 34V137 M${right} 34V137`} stroke={ink} strokeWidth="5.5" strokeLinecap="round" />
      {signs.map(y => <g key={y}>
        <text x={left-13} y={y+4} textAnchor="middle" fill={ochre}>+</text>
        <text x={right+13} y={y+4} textAnchor="middle" fill={plum}>−</text>
      </g>)}
      <path d={connected
        ? `M${left} 137 V158 H173 M187 158 H${right} V137`
        : `M${left} 137 V158 H162 M198 158 H${right} V137`}
        stroke={muted} strokeWidth="2" fill="none" />
      {connected && <path d="M173 147V169 M187 151V165" stroke={teal} strokeWidth="3.4" strokeLinecap="round" />}
      {!connected && <><circle cx="162" cy="158" r="3" fill={muted} /><circle cx="198" cy="158" r="3" fill={muted} /></>}
    </Diagram>
    <ToggleGroup type="single" value={connected ? "connected" : "isolated"}
      onValueChange={value => {
        if (value === "isolated") setIsolatedCharge(charge);
        if (value === "connected") setIsolatedCharge(null);
      }}
      className="lesson-experiment-options" aria-label="Подключение конденсатора">
      <ToggleGroupItem value="connected">Подключён</ToggleGroupItem>
      <ToggleGroupItem value="isolated">Отключён</ToggleGroupItem>
    </ToggleGroup>
    <div className="lesson-reflection-control">
      <span>Зазор</span><output>{gapLabel} мм</output>
      <Slider value={[gap]} min={1} max={2} step={.25} onValueChange={([value]) => setGap(value)}
        className="lesson-reflection-slider" thumbProps={{"aria-label":"Зазор между пластинами","aria-valuetext":gapLabel+" мм"}} />
    </div>
    <dl className="lesson-capacitor-values" aria-live="polite">
      <div><dt>Ёмкость</dt><dd>{label(capacitance)} нФ</dd></div>
      <div><dt>Заряд</dt><dd>{label(charge)} нКл</dd></div>
      <div><dt>Напряжение</dt><dd>{label(voltage)} В</dd></div>
    </dl>
  </div>;
}

function Axes({ x = 52, y = 163, right = 328, top = 28, xlabel, ylabel }) {
  return <>
    <Arrow from={[x,y]} to={[right,y]} color={ink} />
    <Arrow from={[x,y]} to={[x,top]} color={ink} />
    <text x={x - 8} y={top - 8} textAnchor="middle">{ylabel}</text>
    <text x={right} y={y + 24} textAnchor="end">{xlabel}</text>
    <text x={x - 9} y={y + 15} textAnchor="end">0</text>
  </>;
}

function CoulombForces() {
  const [separation, setSeparation] = useState("10");
  const [rightSign, setRightSign] = useState("positive");
  const distanceCm = Number(separation);
  const attracts = rightSign === "negative";
  const forceAtTenCentimetres = 9e9 * 20e-9 * 10e-9 / 0.1 ** 2;
  const ratio = (10 / distanceCm) ** 2;
  const force = forceAtTenCentimetres * ratio;
  const reading = (force * 1e6).toLocaleString("ru", { maximumFractionDigits: 1 }) + " мкН";
  const gap = distanceCm * 6.8;
  const arrowLength = 56 * ratio;
  const direction = attracts ? 1 : -1;
  const leftX = 160 - gap / 2, rightX = 160 + gap / 2;
  const y = 58;
  const distanceText = distanceCm + " см";
  return <div className="coulomb-pair lesson-figure-experiment" data-nodrag>
    <Diagram title={`Расстояние ${distanceText}. Сила на каждый заряд ${reading}. ${attracts ? "Притяжение." : "Отталкивание."}`} viewBox="0 0 320 148">
      <path d="M13 58H307" stroke="#c9c4dc" strokeDasharray="4 6" />
      {[
        {x:leftX, arrowY:24, sign:"+", color:"#996033", fill:"#f6d7ad", direction},
        {x:rightX, arrowY:94, sign:attracts ? "−" : "+", color:attracts ? "#496288" : "#996033", fill:attracts ? "#d5e4f7" : "#f6d7ad", direction:-direction},
      ].map(charge => {
        return <g key={charge.x}>
          <path d={`M${charge.x} 24V112`} stroke="#8a7999" strokeDasharray="3 4" />
          <Arrow from={[charge.x, charge.arrowY]} to={[charge.x + charge.direction * arrowLength, charge.arrowY]} color={plum} />
          <circle cx={charge.x} cy={y} r="16" fill={charge.fill} stroke={charge.color} strokeWidth="1.8" />
          <text x={charge.x} y="63" textAnchor="middle" fill={charge.color} fontSize="21" fontWeight="680">{charge.sign}</text>
        </g>;
      })}
      <path d={`M${leftX} 109 V119M${leftX} 114 H${rightX}M${rightX} 109 V119`} stroke="#8a7999" fill="none" />
      <text x="160" y="140" textAnchor="middle">{distanceText}</text>
    </Diagram>
    <div className="coulomb-reading" role="status"><span>{attracts ? "Притяжение" : "Отталкивание"}</span><b>{reading} на каждый</b></div>
    <div className="coulomb-controls">
      <span>Расстояние</span>
      <ToggleGroup type="single" value={separation} onValueChange={value => value && setSeparation(value)} aria-label="Расстояние между зарядами">
        <ToggleGroupItem value="10">10 см</ToggleGroupItem><ToggleGroupItem value="20">20 см</ToggleGroupItem>
      </ToggleGroup>
      <span>Правый заряд</span>
      <ToggleGroup type="single" value={rightSign} onValueChange={value => value && setRightSign(value)} aria-label="Правый заряд">
        <ToggleGroupItem value="positive">+10 нКл</ToggleGroupItem><ToggleGroupItem value="negative">−10 нКл</ToggleGroupItem>
      </ToggleGroup>
    </div>
  </div>;
}

function OhmLines() {
  return <Diagram title="Зависимость тока от напряжения у двух проводников. При одном напряжении ток больше у проводника с меньшим сопротивлением." viewBox="0 0 360 202">
    <Axes xlabel="U" ylabel="I" />
    <path d="M52 163L252 42" fill="none" strokeWidth="3" strokeLinecap="round" stroke={plum} />
    <path d="M52 163L307 113" fill="none" strokeWidth="3" strokeLinecap="round" stroke={ochre} />
    <path d="M193 163V78 M52 78H193 M52 135H193" fill="none" stroke={muted} strokeDasharray="4 5" />
    <circle cx="193" cy="78" r="4.5" fill={plum} />
    <circle cx="193" cy="135" r="4.5" fill={ochre} />
    <text x="266" y="44" fill={plum}>меньше R</text>
    <text x="305" y="101" textAnchor="end" fill={ochre}>больше R</text>
  </Diagram>;
}

function OhmSlope() {
  const [selected, setSelected] = useState("4");
  const resistance = Number(selected);
  const voltageSteps = [2,6];
  const [first, second] = voltageSteps.map(voltage => voltage / resistance);
  const deltaI = second - first;
  const toX = voltage => 46 + 32 * voltage;
  const toY = current => 154 - 62 * current;
  const [u1,u2] = voltageSteps.map(toX);
  const label = current => current.toLocaleString("ru");
  return <div className="ohm-slope" data-nodrag>
    <Diagram title={resistance + " Ом. Ток при 2 вольтах " + label(first) + " А, при 6 вольтах " + label(second) + " А."} viewBox="0 0 320 194">
      <path d={"M" + u1 + " " + toY(first) + "H" + u2 + "V" + toY(second) + "Z"} fill="#ede1f3" />
      <Axes x={46} y={154} right={307} top={26} xlabel="U, В" ylabel="I, А" />
      {[4,8].map(value => {
        const x = toX(8), y = toY(8 / value);
        return <path key={value} d={"M46 154L" + x + " " + y} stroke={value === resistance ? plum : "#96849f"}
          strokeWidth={value === resistance ? 3.5 : 1.6} strokeDasharray={value === resistance ? undefined : "4 4"} />;
      })}
      <path d={"M" + u1 + " " + toY(first) + "H" + u2 + "V" + toY(second)} fill="none" stroke={ochre} strokeDasharray="3 4" strokeWidth="2" />
      {[[u1,first],[u2,second]].map(([x,current],index) => <g key={x}>
        <path d={"M46 " + toY(current) + "H" + x + "V154"} fill="none" stroke="#a79aae" strokeDasharray="4 4" />
        <circle cx={x} cy={toY(current)} r="4.5" fill={plum} stroke="#fff8f3" strokeWidth="1.3" />
        <text x={x} y="176" textAnchor="middle">{voltageSteps[index]}</text>
        <text x="36" y={toY(current) + 5} textAnchor="end">{label(current)}</text>
      </g>)}
      <text x={u2 + 10} y={(toY(first)+toY(second))/2 + 5} fill={ochre}>ΔI</text>
      <text x={(u1+u2)/2} y="176" textAnchor="middle" fill={ochre}>ΔU</text>
    </Diagram>
    <ToggleGroup type="single" className="lesson-experiment-options ohm-select" value={selected}
      onValueChange={value => value && setSelected(value)} aria-label="Выбранный проводник">
      <ToggleGroupItem value="4">Провод A</ToggleGroupItem><ToggleGroupItem value="8">Провод Б</ToggleGroupItem>
    </ToggleGroup>
    <div className="ohm-readings" role="status">
      <span>ΔU = 4 В</span><span>ΔI = {label(deltaI)} А</span><strong>R = {resistance} Ом</strong>
    </div>
  </div>;
}

function ChargeThroughSection() {
  return <Diagram title="В металлическом проводе электроны дрейфуют влево через отмеченное сечение. Условное направление тока вправо." viewBox="0 0 360 201">
    <path d="M29 61H331V133H29Z" fill="#efd6bd" />
    <path d="M29 61H331 M29 133H331" stroke="#a8785c" strokeWidth="2.5" />
    <path d="M180 61a14 36 0 0 1 0 72" fill="#e6b892" fillOpacity=".62" stroke={ochre} strokeWidth="1.8" />
    <path d="M180 61a14 36 0 0 0 0 72" fill="none" stroke={ochre} strokeWidth="1.8" strokeDasharray="3 4" />
    <g fill={plum} fontWeight="650" textAnchor="middle">
      {[[93,94],[156,105],[223,87],[288,111]].map(([x,y]) => <g key={x}>
        <circle cx={x} cy={y} r="11.5" fill="#f5ecf5" stroke={plum} strokeWidth="1.5" />
        <text x={x} y={y+5}>−</text>
      </g>)}
    </g>
    <Arrow from={[158,39]} to={[72,39]} color={plum} />
    <text x="172" y="44" fill={plum}>Дрейф электронов</text>
    <Arrow from={[72,160]} to={[158,160]} color={teal} />
    <text x="172" y="165" fill={teal}>Ток</text>
  </Diagram>;
}

function CopperWires() {
  const samples = [
    { label: "Исходный провод", y: 46, length: 104, radius: 8, resistance: "R" },
    { label: "Вдвое длиннее", y: 108, length: 208, radius: 8, resistance: "2R" },
    { label: "Вдвое больше сечение", y: 170, length: 104, radius: 8 * Math.SQRT2, resistance: "R/2" },
  ];
  const start = 27;
  return <Diagram title="Три провода из одной меди. У первого сопротивление R. У второго длина вдвое больше при том же сечении, сопротивление 2R. У третьего сечение вдвое больше при той же длине, сопротивление R пополам." viewBox="0 0 360 199">
    {samples.map(({label, y, length, radius, resistance}) => <g key={label}>
      <text x={start} y={y - 20}>{label}</text>
      <LessonProp name="copper-wire" x={start} y={y - radius} width={length} height={radius * 2} fit="none" />
      <text x="320" y={y + 6} textAnchor="end" fill={plum} fontWeight="650">{resistance}</text>
    </g>)}
  </Diagram>;
}

function Branch() {
  return <Diagram title="На развилке ток делится между двумя параллельно подключёнными лампами. После соединения ветвей токи складываются." viewBox="0 0 360 211">
    <g stroke={ink} strokeWidth="2.6" fill="none" strokeLinejoin="round">
      <path d="M27 105H87V55H163 M193 55H271V155H193 M163 155H87V105 M271 105H332" />
      <circle cx="178" cy="55" r="15" fill="#fff4e7" /><circle cx="178" cy="155" r="15" fill="#fff4e7" />
      <path d="M169 46l18 18m0-18l-18 18 M169 146l18 18m0-18l-18 18" strokeWidth="1.7" />
    </g>
    <g fill={plum}><circle cx="87" cy="105" r="5" /><circle cx="271" cy="105" r="5" /></g>
    <Arrow from={[30,105]} to={[64,105]} color={plum} />
    <Arrow from={[100,55]} to={[137,55]} color={teal} />
    <Arrow from={[100,155]} to={[137,155]} color={ochre} />
    <Arrow from={[288,105]} to={[322,105]} color={plum} />
    <text x="44" y="91" textAnchor="middle" fill={plum}>I</text>
    <text x="307" y="91" textAnchor="middle" fill={plum}>I</text>
    <text x="116" y="38" textAnchor="middle" fill={teal}>I₁</text>
    <text x="116" y="180" textAnchor="middle" fill={ochre}>I₂</text>
    <text x="180" y="202" textAnchor="middle">I = I₁ + I₂</text>
  </Diagram>;
}

function BranchBreak() {
  const [open, setOpen] = useState(false);
  const voltage = 6, resistance = 6;
  const current = voltage / resistance;
  const interrupted = open ? 0 : current;
  const total = current + interrupted;
  return <div className="branch-break" data-nodrag>
    <dl className="branch-lights" aria-label="Ток в ветвях цепи">
      {[["Верхняя ветвь", interrupted], ["Нижняя ветвь", current]].map(([name, amps]) => <div key={name} data-lit={amps > 0}>
        <img src="/art/lesson-plates/bulb.webp" width="66" height="93" alt="" />
        <dt>{name}</dt>
        <dd>{amps} А</dd>
      </div>)}
    </dl>
    <div className="branch-controls">
      <Button type="button" variant="secondary" onClick={() => setOpen(value => !value)}>
        {open ? "Замкнуть верхнюю ветвь" : "Разомкнуть верхнюю ветвь"}
      </Button>
      <p className="branch-result" role="status">У источника <b>{total} А</b>. Ветви <b>{interrupted} и {current} А</b>.</p>
    </div>
  </div>;
}

function SourceCircuit() {
  return <Diagram title="Эквивалентная схема батареи. Внутри выделенной области источник ЭДС и внутреннее сопротивление r. Снаружи сопротивление нагрузки R." viewBox="0 0 360 210">
    <rect x="50" y="43" width="129" height="132" rx="17" fill="#f0dff0" stroke={muted} strokeDasharray="5 5" />
    <g stroke={ink} strokeWidth="2.8" fill="none" strokeLinejoin="round">
      <path d="M113 78V67H256V92 M256 131V155H113V131 M113 106V112" />
      <rect x="106" y="78" width="14" height="28" rx="2" />
      <path d="M99 112H127 M105 126H121 M113 126V131" />
      <rect x="246" y="92" width="20" height="39" rx="2" />
    </g>
    <text x="134" y="101">r</text><text x="134" y="123">ℰ</text>
    <text x="279" y="116">R</text>
    <Arrow from={[197,67]} to={[230,67]} color={plum} />
    <text x="211" y="54" textAnchor="middle" fill={plum}>I</text>
    <text x="114" y="199" textAnchor="middle">Батарея</text>
    <text x="257" y="199" textAnchor="middle">Нагрузка</text>
  </Diagram>;
}

function Meters() {
  const [instrument, setInstrument] = useState("ammeter");
  const measuringCurrent = instrument === "ammeter";
  const reading = measuringCurrent ? "Ток через резистор 0,5 А" : "Между выводами резистора 6 В";
  const currentPath = "M167 162H48V46H116 M152 46H204 M276 46H314V162H193";
  const voltagePath = "M192 46V106H223 M257 106H287V46";
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`${reading}. Амперметр в общей ветви, вольтметр между выводами резистора.`} viewBox="0 0 360 202">
      <path d={measuringCurrent ? currentPath : voltagePath} stroke={measuringCurrent ? "#dcc6ed" : "#b8dcd9"}
        strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={currentPath} stroke={measuringCurrent ? plum : ink} strokeWidth="2.6" fill="none" strokeLinejoin="round" />
      <path d={voltagePath} stroke={measuringCurrent ? muted : teal} strokeWidth="2.6" fill="none" />
      <path d="M167 143V181 M193 152V172" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
      <rect x="204" y="36" width="72" height="20" rx="3" fill="#e9cfa7" stroke={ochre} strokeWidth="2.2" />
      <circle cx="134" cy="46" r="18" fill={measuringCurrent ? "#dac2eb" : "#f6f3f7"} stroke={plum} strokeWidth="2.3" />
      <circle cx="240" cy="106" r="17" fill={measuringCurrent ? "#f6f3f7" : "#afd6d4"} stroke={teal} strokeWidth="2.3" />
      <circle cx="192" cy="46" r="4.3" fill={ink} /><circle cx="287" cy="46" r="4.3" fill={ink} />
      <text x="134" y="52" textAnchor="middle" fill={plum}>A</text>
      <text x="240" y="112" textAnchor="middle" fill={teal}>V</text>
      <text x="240" y="27" textAnchor="middle" fill={ochre}>12 Ом</text>
      <text x="180" y="198" textAnchor="middle">6 В</text>
      {measuringCurrent && <Arrow from={[63,46]} to={[99,46]} color={plum} />}
    </Diagram>
    <ToggleGroup type="single" value={instrument} onValueChange={value => value && setInstrument(value)}
      className="lesson-experiment-options" aria-label="Прибор на схеме">
      <ToggleGroupItem value="ammeter">Амперметр</ToggleGroupItem>
      <ToggleGroupItem value="voltmeter">Вольтметр</ToggleGroupItem>
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">{reading}</p>
  </div>;
}

function BatteryUnderLoad() {
  const [load, setLoad] = useState("open");
  const emf = 12;
  const internalResistance = 2;
  const current = load === "open" ? 0 : emf / (Number(load) + internalResistance);
  const drop = current * internalResistance;
  const terminal = emf - drop;
  return <div className="lesson-figure-experiment lesson-battery-drop" data-nodrag>
    <div className="battery-figure">
      <img src="/art/lesson-plates/battery.webp" width="127" height="45" alt="" />
      <div>
        <p>ЭДС <b>{emf} В</b></p>
        <div className="battery-band" aria-hidden="true"><span style={{width:`${100 * terminal / emf}%`}} /></div>
      </div>
    </div>
    <dl className="battery-readout">
      <div><dt>На клеммах</dt><dd>{terminal} В</dd></div>
      <div><dt>Падение внутри</dt><dd>{drop} В</dd></div>
    </dl>
    <ToggleGroup type="single" value={load} onValueChange={value => value && setLoad(value)}
      className="lesson-experiment-options" aria-label="Нагрузка батареи">
      <ToggleGroupItem value="open">Разомкнуто</ToggleGroupItem>
      <ToggleGroupItem value="10">10 Ом</ToggleGroupItem>
      <ToggleGroupItem value="4">4 Ом</ToggleGroupItem>
      <ToggleGroupItem value="2">2 Ом</ToggleGroupItem>
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">Ток {current} А. <span className="sr-only">На клеммах {terminal} В, внутри {drop} В.</span></p>
  </div>;
}

function TerminalVoltage() {
  const x = 50, y = 148;
  const at = (current, voltage) => [x + current * 90, y - voltage * 9];
  const first = at(1,10), second = at(2,8), start = at(0,12);
  return <Diagram title="График напряжения на клеммах от тока. При 1 ампере напряжение 10 вольт, при 2 амперах 8 вольт. Линия пересекает ось напряжения при 12 вольтах." viewBox="0 0 360 193">
    <Axes x={x} y={y} right={334} top={24} xlabel="I, А" ylabel="U, В" />
    <path d={`M${first[0]} ${first[1]} H${x} M${first[0]} ${first[1]} V${y} M${second[0]} ${second[1]} H${x} M${second[0]} ${second[1]} V${y}`}
      fill="none" stroke={muted} strokeDasharray="4 5" />
    <path d={`M${start.join(' ')} L${first.join(' ')}`} fill="none" stroke={plum} strokeWidth="2.7" strokeDasharray="5 5" />
    <path d={`M${first.join(' ')} L${at(2.85,6.3).join(' ')}`} fill="none" stroke={plum} strokeWidth="3.2" />
    {[start,first,second].map(([cx,cy],i) => <g key={cx}>
      <circle cx={cx} cy={cy} r="4.6" fill={i===0 ? plum : ochre} />
      <text x="40" y={cy+5} textAnchor="end">{12-2*i}</text>
      {i>0 && <text x={cx} y={y+23} textAnchor="middle">{i}</text>}
    </g>)}
    <text x="58" y="36" fill={plum}>ЭДС</text>
  </Diagram>;
}

function PowerBars() {
  return <Diagram title="При одинаковом требуемом нагреве чайник 2 киловатта работает вдвое меньше времени, чем чайник 1 киловатт. Без потерь энергия одинакова." viewBox="0 0 360 190">
    <path d="M100 25V148H330" fill="none" stroke={muted} strokeWidth="1.5" />
    <rect x="100" y="34" width="190" height="34" rx="8" fill="#c3a3dc" />
    <rect x="100" y="87" width="95" height="34" rx="8" fill="#e8bc76" />
    <text x="84" y="56" textAnchor="end">1 кВт</text>
    <text x="84" y="109" textAnchor="end">2 кВт</text>
    <text x="302" y="56" fill={plum}>t</text>
    <text x="208" y="109" fill={ochre}>t/2</text>
    <text x="328" y="172" textAnchor="end">Время нагрева</text>
  </Diagram>;
}

function HeatingComparison() {
  const [mode, setMode] = useState("current");
  const equalCurrent = mode === "current";
  const samples = [2,4].map((resistance,index) => ({
    resistance, power:equalCurrent ? 2**2 * resistance : 4**2 / resistance,
    y:65 + index * 61, color:index === 0 ? "#b199c9" : "#e1aa73",
  }));
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Резисторы 2 и 4 ома. ${equalCurrent ? "При одном токе 2 ампера мощности 8 и 16 ватт." : "При одном напряжении 4 вольта мощности 8 и 4 ватта."}`} viewBox="0 0 360 162">
      <text x="322" y="25" textAnchor="end" fill={plum}>Мощность нагрева, Вт</text>
      {samples.map(({resistance,power,y,color}) => <g key={resistance}>
        <text x="24" y={y+5} fontWeight="650">{resistance} Ом</text>
        <rect x="87" y={y-12} width="208" height="24" rx="8" fill="#f0e5dc" />
        <rect className="lesson-power-band" x="87" y={y-12} style={{width:13*power}} height="24" rx="8" fill={color} />
        <text x="332" y={y+5} textAnchor="end" fontWeight="650">{power}</text>
      </g>)}
    </Diagram>
    <ToggleGroup type="single" value={mode} onValueChange={value => value && setMode(value)}
      className="lesson-experiment-options" aria-label="Общая величина для двух резисторов">
      <ToggleGroupItem value="current">Ток 2 А</ToggleGroupItem>
      <ToggleGroupItem value="voltage">Напряжение 4 В</ToggleGroupItem>
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">Больше тепла за секунду выделяет резистор {equalCurrent ? "4" : "2"} Ом</p>
  </div>;
}

function DielectricEnergy() {
  const states = [{x:102,voltage:100,energy:10},{x:258,voltage:50,energy:5}];
  return <Diagram title="У отключённого конденсатора модуль заряда остаётся 200 микрокулонов. После вставки диэлектрика напряжение падает со 100 до 50 вольт, энергия с 10 до 5 миллиджоулей." viewBox="0 0 360 229">
    {states.map(({x,voltage,energy},index) => <g key={voltage}>
      <text x={x} y="24" textAnchor="middle">{index === 0 ? "Воздух" : "Диэлектрик"}</text>
      {index === 1 && <rect x={x-24} y="45" width="48" height="66" rx="4" fill="#bcdbd9" />}
      <path d={`M${x-24} 43V114 M${x+24} 43V114`} stroke={plum} strokeWidth="4" strokeLinecap="round" />
      <text x={x-31} y="84" textAnchor="end" fill={ochre}>+</text>
      <text x={x+31} y="84" fill={plum}>−</text>
      <text x={x} y="146" textAnchor="middle">{voltage} В</text>
      <rect x={x-46} y="166" width="92" height="12" rx="6" fill="#e9dced" />
      <rect x={x-46} y="166" width={9.2*energy} height="12" rx="6" fill="#b18ac3" />
      <text x={x} y="205" textAnchor="middle" fill={plum} fontWeight="650">{energy} мДж</text>
    </g>)}
  </Diagram>;
}

function WorkSigns() {
  return <Diagram title="Ящик скользит по горизонтальному полу вправо. Тяга направлена вправо и даёт положительную работу. Трение направлено влево и даёт отрицательную работу. Силы тяжести и реакции опоры вертикальны, их работа равна нулю." viewBox="0 0 360 226">
    <path d="M29 161H331" stroke={muted} strokeWidth="2" strokeLinecap="round" />
    <LessonProp name="wood-crate" x={145} y={105} width={70} height={56} fit="none" />
    <path d="M145 132H215 M180 105V161" fill="none" stroke="#fff1d8" strokeWidth="5" strokeOpacity=".85" />
    <Arrow from={[180,132]} to={[304,132]} color={plum} />
    <Arrow from={[180,132]} to={[57,132]} color={ochre} />
    <Arrow from={[180,132]} to={[180,53]} color={teal} />
    <Arrow from={[180,132]} to={[180,211]} color={teal} />
    <circle cx="180" cy="132" r="4" fill={ink} />
    <Arrow from={[233,192]} to={[309,192]} color={ink} />
    <text x="261" y="115" textAnchor="middle" fill={plum}>Тяга · +</text>
    <text x="99" y="115" textAnchor="middle" fill={ochre}>Трение · −</text>
    <text x="180" y="37" textAnchor="middle" fill={teal}>Реакция опоры · 0</text>
    <text x="169" y="211" textAnchor="end" fill={teal}>Тяжесть · 0</text>
    <text x="271" y="215" textAnchor="middle">Перемещение</text>
  </Diagram>;
}

function BrakingDistances() {
  const start = 27;
  const dry = 95;
  const ice = 299;
  return <Diagram title="С одной и той же начальной скорости путь на сухом асфальте около 19 метров. Путь на льду 75 метров, в четыре раза длиннее." viewBox="0 0 360 182">
    <path d={`M${start} 33V148`} stroke={muted} strokeWidth="1.5" strokeDasharray="4 5" />
    <text x={start} y="26">Сухой асфальт</text>
    <path d={`M${start} 45H${dry}V63H${start}Z`} fill="#926078" />
    <text x={dry + 10} y="60" fill={plum} fontWeight="650">≈19 м</text>
    <text x={start} y="101">Лёд</text>
    <path d={`M${start} 120H${ice}V138H${start}Z`} fill="#7faab7" />
    <path d={`M${dry} 124V134 M${dry + 68} 124V134 M${dry + 136} 124V134`} stroke="#edf7f7" strokeWidth="2" />
    <text x={ice + 9} y="135" fill={teal} fontWeight="650">75 м</text>
    <text x={start} y="170">Старт в обоих случаях: 54 км/ч</text>
  </Diagram>;
}

function IntoPage() {
  return <g stroke="#91a6b3" strokeWidth="1.5" opacity=".72">
    {[52,103,154,205,256,307].flatMap(x => [49,87,125,163].map(y =>
      <path key={`${x}-${y}`} d={`M${x-3} ${y-3}l6 6m0-6-6 6`} />
    ))}
  </g>;
}

function Ampere() {
  const [current, setCurrent] = useState("right");
  const rightward = current === "right";
  const reading = current === "off" ? "Тока нет. Сила равна нулю." : `Сила направлена ${rightward ? "вверх" : "вниз"}.`;
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Поле направлено от нас. ${reading}`} viewBox="0 0 360 211">
      <IntoPage />
      <path d="M29 106H331" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />
      {current !== "off" && <>
        <Arrow from={rightward ? [207,106] : [287,106]} to={rightward ? [287,106] : [207,106]} color={ochre} outline="#eaf2f1" />
        <Arrow from={[169,106]} to={[169,rightward ? 38 : 174]} color={plum} outline="#eaf2f1" />
        <text x="184" y={rightward ? 44 : 176} fill={plum}>F</text>
        <text x={rightward ? 276 : 211} y="89" fill={ochre}>I</text>
      </>}
      <text x="180" y="205" textAnchor="middle">× — поле от нас</text>
    </Diagram>
    <ToggleGroup type="single" value={current} onValueChange={value => { if(value) setCurrent(value); }}
      aria-label="Ток в проводе" className="lesson-experiment-options">
      <ToggleGroupItem value="right">Вправо</ToggleGroupItem>
      <ToggleGroupItem value="left">Влево</ToggleGroupItem>
      <ToggleGroupItem value="off">Выключен</ToggleGroupItem>
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">{reading}</p>
  </div>;
}

function Lorentz() {
  const [charge, setCharge] = useState("positive");
  const positive = charge === "positive";
  const centerY = positive ? 64 : 152;
  const arcEnd = positive ? 20 : 196;
  const reading = `Начальная скорость вправо. Сила ${positive ? "вверх" : "вниз"}.`;
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Поле направлено от нас. Заряд ${positive ? "положительный" : "отрицательный"}. ${reading}`} viewBox="0 0 360 220">
      <IntoPage />
      <circle cx="151" cy={centerY} r="44" fill="none" stroke={teal} strokeWidth="1.8" strokeDasharray="4 5" />
      <path d={`M151 108 A44 44 0 0 ${positive ? 0 : 1} 151 ${arcEnd}`} fill="none" stroke={teal} strokeWidth="3" strokeLinecap="round" />
      <circle cx="151" cy={centerY} r="3" fill={plum} />
      <Arrow from={[151,108]} to={[266,108]} color={ochre} outline="#eaf2f1" />
      <Arrow from={[151,108]} to={[151,centerY]} color={plum} outline="#eaf2f1" />
      <circle cx="151" cy="108" r="7" fill="#f3c174" stroke={ink} strokeWidth="1.5" />
      <text x="265" y="92" fill={ochre}>v</text>
      <text x="134" y={positive ? 72 : 151} textAnchor="end" fill={plum}>F</text>
      <text x="130" y="113" textAnchor="end">{positive ? "+q" : "−q"}</text>
      <text x="180" y="215" textAnchor="middle">× — поле от нас</text>
    </Diagram>
    <ToggleGroup type="single" value={charge} onValueChange={value => { if(value) setCharge(value); }}
      aria-label="Знак заряда частицы" className="lesson-experiment-options">
      <ToggleGroupItem value="positive">Заряд +</ToggleGroupItem>
      <ToggleGroupItem value="negative">Заряд −</ToggleGroupItem>
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">{reading}</p>
  </div>;
}

function WireProjection() {
  const [angle, setAngle] = useState("30");
  const direction = Number(angle) * Math.PI / 180;
  const sine = Math.sin(direction);
  const x = 69 + 106 * Math.cos(direction), y = 121 - 106 * sine;
  const length = (25 * sine).toLocaleString("ru", { maximumFractionDigits:1 });
  const force = (.4 * .25 * 3 * sine).toLocaleString("ru", { maximumFractionDigits:2 });
  return <div className="wire-projection" data-nodrag>
    <Diagram title={`Провод 25 см. При угле ${angle}° поперечная проекция ${length} см, модуль силы Ампера ${force} Н.`} viewBox="0 0 280 160">
      <path d={`M69 121H${x}V${y}Z`} fill="#e7d9ef" />
      <Arrow from={[35,121]} to={[245,121]} color={teal} />
      {angle !== "0" && <path d={`M${x} ${y}V121`} stroke={ochre} strokeWidth="2.4" strokeDasharray="4 4" fill="none" />}
      <Arrow from={[69,121]} to={[x,y]} color={plum} />
      <text x="234" y="112" fill={teal}>B</text>
      <text x={Math.max(89,x-29)} y={y-8} fill={plum}>25 см</text>
      {angle === "30" && <path d="M107 121 A38 38 0 0 0 101.9 102" stroke={ochre} strokeWidth="1.8" fill="none" />}
      <text x="69" y="148" fill="#725230">{angle}° к полю</text>
    </Diagram>
    <ToggleGroup type="single" value={angle} onValueChange={value => value && setAngle(value)}
      className="lesson-experiment-options wire-angles" aria-label="Угол между током и полем">
      {["0","30","90"].map(item => <ToggleGroupItem key={item} value={item}>{item}°</ToggleGroupItem>)}
    </ToggleGroup>
    <dl className="wire-readout" aria-live="polite">
      <div><dt>Поперечная часть</dt><dd>{length} см</dd></div><div><dt>Сила Ампера</dt><dd>{force} Н</dd></div>
    </dl>
  </div>;
}

function SpiralInField() {
  const [speed, setSpeed] = useState("4");
  const [time, setTime] = useState(.25);
  const timeId = useId();
  const radius = 2, period = 1;
  const pitch = Number(speed) * period;
  const phase = t => 2 * Math.PI * t / period;
  const sideAt = t => [29 + 28 * pitch * t / period, 67 - 13 * radius * Math.cos(phase(t))];
  const endAt = t => [60 - 17 * radius * Math.sin(phase(t)), 53 - 17 * radius * Math.cos(phase(t))];
  const [x,y] = sideAt(time);
  const [u,v] = endAt(time);
  const elapsed = time.toLocaleString("ru") + " с";
  return <div className="helix-viewer" data-nodrag>
    <div className="helix-views">
      <div className="helix-side">
        <h3>Сбоку</h3>
        <Diagram title={"Вид сбоку. За оборот частица сдвигается вдоль поля на " + pitch + " см."} viewBox="0 0 278 106">
          <Arrow from={[16,67]} to={[264,67]} color={teal} />
          <text x="261" y="43" textAnchor="end" fill={teal}>B</text>
          <polyline points={curve(48,sideAt)} stroke="#857093" strokeWidth="1.9" strokeDasharray="4 4" fill="none" />
          <polyline points={curve(36,t => sideAt(t*time))} stroke={plum} strokeWidth="3" fill="none" strokeLinecap="round" />
          {pitch > 0 && <g>
            <path d={"M29 91v8m0-4H" + sideAt(1)[0] + "m0-4v8"} fill="none" stroke={ochre} strokeWidth="1.5" />
          </g>}
          <circle cx={x} cy={y} r="5" fill="#f3bb77" stroke="#765388" strokeWidth="2" />
        </Diagram>
      </div>
      <div className="helix-end">
        <h3>Вдоль поля</h3>
        <Diagram title={"Вид вдоль поля. Проекция остаётся окружностью радиусом " + radius + " см."} viewBox="0 0 120 106">
          <circle cx="60" cy="53" r={17*radius} fill="none" stroke="#857093" strokeWidth="1.9" strokeDasharray="4 4" />
          <path d="M41 53h38M60 34v38" stroke="#af9ab9" strokeWidth="1.2" />
          <polyline points={curve(36,t => endAt(t*time))} stroke={plum} strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx={u} cy={v} r="5" fill="#f3bb77" stroke="#765388" strokeWidth="2" />
        </Diagram>
      </div>
    </div>
    <div className="helix-data" role="status">Радиус <b>{radius} см</b> <span aria-hidden="true">·</span> Шаг <b>{pitch} см</b></div>
    <p className="helix-setting">Скорость вдоль поля</p>
    <ToggleGroup type="single" value={speed} onValueChange={value => value && setSpeed(value)}
      className="lesson-experiment-options helix-options" aria-label="Скорость вдоль поля">
      {[0,4,8].map(value => <ToggleGroupItem key={value} value={String(value)}>{value} см/с</ToggleGroupItem>)}
    </ToggleGroup>
    <div className="lesson-reflection-control helix-clock">
      <span id={timeId}>Время от старта</span><output>{elapsed}</output>
      <Slider className="lesson-reflection-slider" min={0} max={1} step={.25} value={[time]}
        onValueChange={([value]) => setTime(value)}
        thumbProps={{ "aria-labelledby":timeId, "aria-valuetext":elapsed + ", сдвиг вдоль поля " + (pitch*time).toLocaleString("ru") + " см" }} />
    </div>
  </div>;
}

function curve(count, point) {
  return Array.from({ length: count + 1 }, (_,i) => point(i / count).map(x => x.toFixed(1)).join(",")).join(" ");
}

function Inductor() {
  const path = curve(40, t => [52 + 257*t, 163 - 111*(1-Math.exp(-4.6*t))]);
  return <Diagram title="В цепи с источником постоянного напряжения, резистором и катушкой ток растёт от нуля до установившегося значения. В начале наклон больше." viewBox="0 0 360 202">
    <Axes xlabel="t" ylabel="I" />
    <path d="M52 52H309" stroke={muted} strokeDasharray="4 5" />
    <text x="307" y="44" textAnchor="end">Установившийся ток</text>
    <polyline points={path} fill="none" stroke={plum} strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="52" cy="163" r="4" fill={ochre} />
  </Diagram>;
}

function InducedSlope() {
  return <Diagram title="Ток растёт по прямой с 2 до 8 А за 0,3 с. Приращение тока 6 А." viewBox="0 0 360 205">
    <Axes x={51} y={154} right={331} top={31} xlabel="t, с" ylabel="I, А" />
    <path d="M51 127H269V46Z" fill="#e9ddec" />
    <path d="M51 46H269V154 M51 127H269" fill="none" stroke={muted} strokeWidth="1.5" strokeDasharray="4 4" />
    <path d="M51 127L269 46" stroke={plum} strokeWidth="3" fill="none" />
    <circle cx="51" cy="127" r="4" fill={plum} />
    <circle cx="269" cy="46" r="4" fill={plum} />
    <text x="39" y="132" textAnchor="end">2</text>
    <text x="39" y="51" textAnchor="end">8</text>
    <text x="269" y="179" textAnchor="middle">0,3</text>
    <path d="M283 46h6v81h-6" stroke={ochre} strokeWidth="1.6" fill="none" />
    <text x="299" y="91" fill={ochre}>6 А</text>
  </Diagram>;
}

function EqualHeating() {
  const [eighth, setEighth] = useState(8);
  const timeId = useId();
  const fraction = eighth / 8;
  const x = 44, y = 142, span = 245, top = 42;
  const oscillation = curve(112, t => [x + span*t, y - (y-top)*Math.sin(2*Math.PI*t)**2]);
  const average = (top + y) / 2;
  const cursor = x + span * fraction;
  const heated = curve(112, t => [x + span*t*fraction, y - (y-top)*Math.sin(2*Math.PI*t*fraction)**2]);
  const steadyHeat = 16 * fraction;
  // Integral of 32 sin²(2πt) W from 0 to fraction seconds for a one-second period.
  const varyingHeat = steadyHeat - 4 * Math.sin(4 * Math.PI * fraction) / Math.PI;
  const amount = n => n.toLocaleString("ru", { maximumFractionDigits:2 });
  const timeLabel = fraction.toLocaleString("ru") + " с";
  return <div className="equal-heating" data-nodrag>
    <Diagram title={`График мощности. За ${timeLabel} переменный ток дал ${amount(varyingHeat)} Дж, постоянный ${amount(steadyHeat)} Дж.`} viewBox="0 0 320 176">
      <Axes x={x} y={y} right={308} top={24} ylabel="P, Вт" />
      <polygon points={`${x},${y} ${heated} ${cursor},${y}`} fill="#dbcaea" />
      <rect x={x} y={average} width={cursor-x} height={y-average} fill="#7bb0ad" fillOpacity=".24" />
      <path d={`M${x} ${top}H${x+span}`} stroke={muted} strokeDasharray="4 4" opacity=".65" />
      <polyline points={oscillation} stroke={plum} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d={`M${x} ${average}H${x+span}`} stroke={teal} strokeWidth="2.7" strokeDasharray="6 4" />
      <path d={`M${cursor} 30V${y}`} stroke="#7f6888" strokeDasharray="3 4" strokeWidth="1.8" />
      <text x="33" y={top+5} textAnchor="end">32</text>
      <text x="33" y={average+5} textAnchor="end" fill={teal}>16</text>
      <text x={x+span} y={y+24} textAnchor="middle">1 с</text>
      <text x="312" y={y-10} textAnchor="end">t</text>
    </Diagram>
    <dl className="heat-readout">
      <div><dt>Переменный ток</dt><dd>{amount(varyingHeat)} Дж</dd></div>
      <div><dt>Постоянный ток</dt><dd>{amount(steadyHeat)} Дж</dd></div>
    </dl>
    <div className="lesson-reflection-control heat-window">
      <span id={timeId}>От начала периода</span><output>{timeLabel}</output>
      <Slider className="lesson-reflection-slider" min={0} max={8} step={1} value={[eighth]}
        onValueChange={([value]) => setEighth(value)}
        thumbProps={{ "aria-labelledby":timeId, "aria-valuetext":`${timeLabel}. Переменный ${amount(varyingHeat)} Дж, постоянный ${amount(steadyHeat)} Дж` }} />
    </div>
  </div>;
}

function WaveFields() {
  const x = 46, length = 266;
  const samples = [0.125, 0.375, 0.625, 0.875];
  return <Diagram title="Снимок волны в один момент, два вида сбоку. Волна идёт вправо. Электрическое поле колеблется вдоль оси y, магнитное вдоль оси z. Их максимумы приходятся на одни и те же положения по оси x." viewBox="0 0 360 259">
    {[{ name:"Поле E", axis:"y", y:78, color:plum }, { name:"Поле B", axis:"z", y:193, color:teal }].map(({name,axis,y,color}) =>
      <g key={axis}>
        <text x="49" y={y-49} fill={color}>{name}</text>
        <Arrow from={[x,y]} to={[335,y]} color={ink} />
        <Arrow from={[x,y+30]} to={[x,y-31]} color={muted} />
        <text x="32" y={y-22} fill={muted}>{axis}</text>
        <text x="340" y={y+6}>x</text>
        <polyline points={curve(100, t => [x + length*t, y - 31*Math.sin(4*Math.PI*t)])} fill="none" stroke={color} strokeWidth="2.8" />
        {samples.map(t => <Arrow key={t} from={[x+length*t,y]} to={[x+length*t,y-31*Math.sin(4*Math.PI*t)]} color={color} />)}
      </g>
    )}
    <path d={`M${x+length/8} 112V156 M${x+5*length/8} 112V156`} stroke={muted} strokeDasharray="4 4" fill="none" />
    <text x="47" y="248" fill="#4e4567" fontSize="19">Волна идёт вправо</text>
    <Arrow from={[265,242]} to={[332,242]} color={teal} />
  </Diagram>;
}

function WaveCrossing() {
  const boundary = 166, centerY = 101;
  const crestsBefore = [61,121], crestsAfter = [176,216,256,296];
  const spatialWave = (start, stop, wavelength, amplitude) => curve(100, t => {
    const x = start + (stop-start)*t;
    return [x, centerY - amplitude*Math.sin(2*Math.PI*(x-boundary)/wavelength)];
  });
  return <Diagram title="На снимке длина волны слева от границы 600 нм, справа 400 нм. Частота по обе стороны одна и та же." viewBox="0 0 360 188">
    <rect x={boundary} y="10" width="175" height="169" rx="12" fill="#e6edf4" />
    <path d={`M${boundary} 12V177`} stroke={muted} strokeDasharray="5 5" />
    <path d={`M21 ${centerY}H335`} stroke={muted} strokeWidth="1.25" />
    <text x="88" y="34" textAnchor="middle">Вакуум</text><text x="253" y="34" textAnchor="middle">Среда</text>
    <polyline points={spatialWave(24,boundary,60,24)} fill="none" stroke={plum} strokeWidth="3" />
    <polyline points={spatialWave(boundary,330,40,18)} fill="none" stroke={teal} strokeWidth="3" />
    {crestsBefore.map(x => <circle key={x} cx={x} cy={centerY-24} r="3.7" fill={plum} />)}
    {crestsAfter.map(x => <circle key={x} cx={x} cy={centerY-18} r="3.7" fill={teal} />)}
    <path d="M61 131v9h60v-9 M216 131v9h40v-9" stroke={muted} strokeWidth="1.6" fill="none" />
    <text x="91" y="164" fill={plum} textAnchor="middle">600 нм</text>
    <text x="236" y="164" fill={teal} textAnchor="middle">400 нм</text>
  </Diagram>;
}

function LcEnergies() {
  return <Diagram title="Энергии идеального контура за период. В начальный момент энергия электрического поля максимальна, через четверть периода максимальна магнитная, сумма постоянна." viewBox="0 0 360 225">
    <Axes xlabel="t" ylabel="W" />
    <path d="M52 53H305" stroke={muted} strokeDasharray="4 5" />
    {[.25,.5,.75,1].map(t => <path key={t} d={`M${52+250*t} 57V163`} stroke="#d1c0de" strokeDasharray="3 5" />)}
    <polyline points={curve(80,t=>[52+250*t,163-110*Math.cos(2*Math.PI*t)**2])} fill="none" stroke={plum} strokeWidth="2.8" />
    <polyline points={curve(80,t=>[52+250*t,163-110*Math.sin(2*Math.PI*t)**2])} fill="none" stroke={teal} strokeWidth="2.8" />
    <text x="114.5" y="184" textAnchor="middle">T/4</text>
    <text x="177" y="184" textAnchor="middle">T/2</text>
    <text x="302" y="184" textAnchor="middle">T</text>
    <text x="52" y="214" fill={plum}>Электрическая</text>
    <text x="204" y="214" fill={teal}>Магнитная</text>
  </Diagram>;
}

const contourMoments = [
  { label: "0", charge: 1, current: 0, electric: 100, magnetic: 0 },
  { label: "T/8", charge: Math.SQRT1_2, current: Math.SQRT1_2, electric: 50, magnetic: 50 },
  { label: "T/4", charge: 0, current: 1, electric: 0, magnetic: 100 },
  { label: "T/2", charge: -1, current: 0, electric: 100, magnetic: 0 },
  { label: "3T/4", charge: 0, current: -1, electric: 0, magnetic: 100 },
];

function ContourMoments() {
  const [moment, setMoment] = useState(0);
  const {label,charge,current,electric,magnetic} = contourMoments[moment];
  const upper = charge > 0 ? "+" : "−";
  const lower = charge > 0 ? "−" : "+";
  const format = value => Math.abs(value) === Math.SQRT1_2 ? "≈0,71" : String(value).replace("-","−");
  const coil = "M264 53c-26 0-26 16 0 16c-26 0-26 16 0 16c-26 0-26 16 0 16c-26 0-26 16 0 16";
  return <div className="lesson-figure-experiment lesson-contour" data-nodrag>
    <ToggleGroup type="single" value={String(moment)} onValueChange={value => { if(value) setMoment(Number(value)); }}
      aria-label="Момент периода" className="lesson-experiment-options">
      {contourMoments.map(({label},index) => <ToggleGroupItem key={label} value={String(index)}>{label}</ToggleGroupItem>)}
    </ToggleGroup>
    <Diagram title={`Контур в момент ${label}. Энергия электрического поля ${electric} процентов. Энергия магнитного поля ${magnetic} процентов.`} viewBox="0 0 360 172">
      <path d="M104 73V39H264V53 M104 99V133H264V117 M80 73H128 M80 99H128" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d={coil} fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
      {charge !== 0 && <g fill={plum} fontWeight="650" textAnchor="middle">
        <text x="70" y="78">{upper}</text><text x="70" y="104">{lower}</text>
      </g>}
      {current !== 0 && <Arrow from={current > 0 ? [143,39] : [219,39]} to={current > 0 ? [219,39] : [143,39]} color={ochre} />}
      <text x="104" y="158" textAnchor="middle">Конденсатор</text>
      <text x="250" y="158" textAnchor="middle">Катушка</text>
    </Diagram>
    <div aria-live="polite" aria-atomic="true">
      <dl className="lesson-contour-readings">
        <div><dt>Заряд q/qₘ</dt><dd>{format(charge)}</dd></div>
        <div><dt>Ток i/Iₘ</dt><dd>{format(current)}</dd></div>
      </dl>
      <div className="lesson-contour-energy" aria-hidden="true"><span style={{width:`${electric}%`}} /></div>
      <ul className="lesson-contour-legend">
        <li>Электрическое поле <strong>{electric}%</strong></li>
        <li>Магнитное поле <strong>{magnetic}%</strong></li>
      </ul>
    </div>
  </div>;
}

function Spectrum() {
  const bands = [
    ["Радио","#c2ace1"],["Микроволны","#afc6ec"],["ИК","#f1b5a9"],
    ["Видимый свет","#e8bd70"],["УФ","#c6a9e5"],["Рентген","#badbd7"],["Гамма","#b8cbef"],
  ];
  return <Diagram title="Условная шкала по частоте: радиоволны, включая микроволны, инфракрасное излучение, видимый свет, ультрафиолет, рентгеновское и гамма-излучение." viewBox="0 0 360 248">
    {bands.map(([label,fill],i) => <g key={label}>
      <rect x={22 + 13*i} y={14 + 31*i} width={i === 3 ? 24 : 39} height="22" rx="7" fill={fill} />
      <text x={76 + 13*i} y={31 + 31*i}>{label}</text>
    </g>)}
    <Arrow from={[325,33]} to={[325,217]} color={plum} />
    <text x="310" y="114" textAnchor="end" fill={plum}>Частота</text>
    <text x="310" y="134" textAnchor="end" fill={plum}>растёт</text>
  </Diagram>;
}

const waterCriticalAngle = Math.asin(3/4) * 180 / Math.PI;

function Refraction() {
  const [angle,setAngle] = useState(30);
  const radians = angle * Math.PI / 180;
  const sine = (4/3) * Math.sin(radians);
  const atCritical = angle === waterCriticalAngle;
  const reflectedOnly = angle > waterCriticalAngle;
  const beta = atCritical ? Math.PI / 2 : reflectedOnly ? null : Math.asin(sine);
  const angleText = angle.toLocaleString("ru", {maximumFractionDigits:1}) + "°";
  const reading = atCritical ? "Предельный угол. Луч вдоль границы, 90°."
    : reflectedOnly ? "Полное внутреннее отражение."
    : `Угол преломления ${(beta * 180 / Math.PI).toLocaleString("ru",{maximumFractionDigits:1})}°.`;
  const middle = [180,96];
  const ray = (a, ySign, xSign, length) => [180 + xSign*length*Math.sin(a), 96 + ySign*length*Math.cos(a)];
  return <div className="lesson-reflection" data-nodrag>
    <Diagram title={`Луч из воды. Угол падения ${angleText}. ${reading}`} viewBox="0 0 360 192">
      <rect x="16" y="96" width="328" height="85" rx="12" fill="#cce2ed" />
      <path d="M16 96H344" stroke="#73899c" strokeWidth="1.5" />
      <path d="M180 18V174" stroke={muted} strokeDasharray="4 5" />
      <text x="22" y="81">Воздух</text><text x="22" y="122">Вода</text>
      <Arrow from={ray(radians,1,-1,75)} to={middle} color={ochre} />
      <g opacity={reflectedOnly || atCritical ? 1 : .65}>
        <Arrow from={middle} to={ray(radians,1,1,84)} color={plum} />
      </g>
      {beta !== null && <Arrow from={middle} to={ray(beta,-1,1,atCritical ? 113 : 84)} color={teal} />}
      <circle cx="180" cy="96" r="3.4" fill={ink} />
    </Diagram>
    <div className="lesson-reflection-control">
      <span>Угол падения</span><output>{angleText}</output>
      <Slider value={[angle]} onValueChange={([value]) => setAngle(value)} min={0} max={75} step={1}
        className="lesson-reflection-slider" thumbProps={{"aria-label":"Угол падения из воды","aria-valuetext":angleText}} />
      <Button type="button" variant="outline" className="lesson-critical-angle" onClick={() => setAngle(waterCriticalAngle)}>Поставить на порог</Button>
      <p className="lesson-ray-reading" aria-live="polite">{reading}</p>
    </div>
  </div>;
}

function SphericalMirror() {
  const [type,setType] = useState("concave");
  const [distance,setDistance] = useState(40);
  const focal = type === "concave" ? 15 : -15;
  const imageState = lensState(focal,distance);
  const {atFocus,b,magnification} = imageState;
  const signedAmount = value => (value < 0 ? "−" : "+") + Math.abs(value).toLocaleString("ru", {maximumFractionDigits:1});
  const position = b > 0 ? "Действительное перед зеркалом" : "Мнимое за зеркалом";
  return <div className="lesson-figure-experiment lesson-mirror-experiment" data-nodrag>
    <ToggleGroup type="single" value={type} onValueChange={value => { if (value) setType(value); }}
      aria-label="Вид зеркала" className="lesson-experiment-options">
      <ToggleGroupItem value="concave">Вогнутое</ToggleGroupItem>
      <ToggleGroupItem value="convex">Выпуклое</ToggleGroupItem>
    </ToggleGroup>
    <MirrorPlate focal={focal} distance={distance} imageState={imageState} />
    <ToggleGroup type="single" value={String(distance)} onValueChange={value => { if(value) setDistance(Number(value)); }}
      aria-label="От предмета до зеркала" className="lesson-experiment-options">
      {[40,15,10].map(value => <ToggleGroupItem key={value} value={String(value)}>{value} см</ToggleGroupItem>)}
    </ToggleGroup>
    <div className="mirror-readout" role="status">
      {atFocus ? <p>Предмет в фокусе. Отражённые лучи параллельны.</p> : <>
        <p>{position}</p>
        <dl>
          <div><dt>Расстояние b</dt><dd>{signedAmount(b)} см</dd></div>
          <div><dt>Увеличение m</dt><dd>{signedAmount(magnification)}</dd></div>
        </dl>
      </>}
    </div>
  </div>;
}

function ShadowEdges() {
  const [source,setSource] = useState("wide");
  const extended = source === "wide";
  const light = 52, blocker = 176, screen = 310, center = 104, edge = 29;
  const sourceEnds = extended ? [center-18,center+18] : [center,center];
  const project = (start, through) => through + (through-start)*(screen-blocker)/(blocker-light);
  const outerTop = project(sourceEnds[1],center-edge);
  const outerBottom = project(sourceEnds[0],center+edge);
  const innerTop = project(sourceEnds[0],center-edge);
  const innerBottom = project(sourceEnds[1],center+edge);
  const reading = extended ? "Середина тёмная. По краям видна полутень." : "Край тени резкий.";
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={reading} viewBox="0 0 360 218">
      <path d={`M${blocker} ${center-edge} L${screen} ${innerTop} V${innerBottom} L${blocker} ${center+edge}Z`} fill="#bea9cd" />
      {extended && <path d={`M${blocker} ${center-edge}L${screen} ${outerTop}V${innerTop}Z M${blocker} ${center+edge}L${screen} ${outerBottom}V${innerBottom}Z`} fill="#e7d6df" />}
      <path d={`M${light} ${sourceEnds[1]}L${screen} ${outerTop} M${light} ${sourceEnds[0]}L${screen} ${outerBottom}`} stroke={ochre} strokeWidth="1.8" fill="none" />
      {extended && <path d={`M${light} ${sourceEnds[0]}L${screen} ${innerTop} M${light} ${sourceEnds[1]}L${screen} ${innerBottom}`} stroke={ochre} strokeWidth="1.8" fill="none" />}
      <path d={`M${screen} 15V194`} stroke="#ecd49d" strokeWidth="9" strokeLinecap="round" />
      <path d={`M${screen} ${outerTop}V${outerBottom}`} stroke="#b08fbc" strokeWidth="9" />
      <path d={`M${screen} ${innerTop}V${innerBottom}`} stroke="#59446d" strokeWidth="9" />
      <rect x={blocker-5} y={center-edge} width="10" height={2*edge} rx="3" fill={ink} />
      {extended ? <path d={`M${light} ${sourceEnds[0]}V${sourceEnds[1]}`} stroke="#f1bd64" strokeWidth="10" strokeLinecap="round" />
        : <circle cx={light} cy={center} r="5" fill="#f1bd64" stroke={ochre} strokeWidth="1.5" />}
      <text x={light} y="215" textAnchor="middle">Источник</text>
      <text x={blocker} y="215" textAnchor="middle">Преграда</text>
      <text x={screen} y="215" textAnchor="middle">Экран</text>
    </Diagram>
    <ToggleGroup type="single" value={source} onValueChange={value => { if(value) setSource(value); }}
      aria-label="Размер источника" className="lesson-experiment-options">
      <ToggleGroupItem value="point">Точка</ToggleGroupItem>
      <ToggleGroupItem value="wide">Широкий источник</ToggleGroupItem>
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">{reading}</p>
  </div>;
}

function MirrorStep() {
  const mirror = 180, scale = 67;
  return <Diagram title="За секунду человек подходит к зеркалу на полметра, изображение тоже приближается на полметра. Расстояние между ними уменьшается на метр." viewBox="0 0 360 238">
    <rect x="181" width="156" y="13" height="188" rx="12" fill="#ebe7f6" />
    <path d="M180 13V201" stroke={muted} strokeWidth="3" />
    <text x="180" y="227" textAnchor="middle">Зеркало</text>
    {[{distance:1.5,y:67,label:"В начале",gap:"3 м"},{distance:1,y:158,label:"Через 1 с",gap:"2 м"}].map(({distance,y,label,gap}) => {
      const left = mirror-distance*scale, right = mirror+distance*scale;
      return <g key={distance}>
        <text x="30" y={y-32}>{label}</text>
        <Arrow from={[left,y+16]} to={[left,y-12]} color={plum} />
        <Arrow from={[right,y+16]} to={[right,y-12]} color={teal} dashed />
        <path d={`M${left} ${y+23}v8H${right}v-8`} stroke={muted} strokeWidth="1.5" fill="none" />
        <rect x="156" y={y+20} width="48" height="24" rx="8" fill="#f3ecf6" />
        <text x={mirror} y={y+37} textAnchor="middle" fill={plum}>{gap}</text>
      </g>;
    })}
  </Diagram>;
}

function LensConstruction({ solved = false, diverging = false, construction = 2 }) {
  const lens = solved ? 166 : 180;
  const axis = 103, object = solved ? 112 : 53, height = solved ? 24 : 36;
  const focal = solved ? 36 : diverging ? -56 : 56;
  const distance = lens - object;
  const {b:imageDistance,magnification} = lensState(focal,distance);
  const image = lens + imageDistance;
  const tip = axis - height*magnification;
  const upper = axis-height;
  const farEnd = 303;
  const nearEnd = lens+54;
  const afterImage = image+18;
  const imageTitle = solved
    ? "Предмет в 30 сантиметрах перед линзой. Экран в 60 сантиметрах за линзой. Изображение перевёрнуто и вдвое выше предмета."
    : diverging ? "Продолжения преломлённых лучей сходятся слева от рассеивающей линзы. Изображение мнимое, прямое и уменьшенное."
      : "Лучи сходятся справа от собирающей линзы на перевёрнутом действительном изображении.";
  const title = ["Луч проходит через центр линзы без отклонения.",
    "Второй луч идёт параллельно оси и преломляется в линзе. Найди пересечение.", imageTitle][construction];
  return <Diagram title={title} viewBox={solved ? "0 0 360 211" : "22 17 306 170"}>
    <path d="M29 103H333" stroke={muted} strokeDasharray="5 5" />
    <LessonProp name={diverging ? "concave-glass" : "convex-glass"} x={lens - 15} y={24} width={30} height={158} fit="none" />
    <circle cx={lens} cy={axis} r="2.4" fill={ink} />
    {solved && <path d={`M${image} 45 V170`} stroke={muted} strokeWidth="3" strokeLinecap="round" />}
    <Arrow from={[object,upper]} to={diverging
      ? [farEnd,axis + height*(farEnd-lens)/distance]
      : solved ? [image,tip] : [afterImage,tip+height*18/distance]} color={plum} />
    {construction >= 1 && <>
      <path d={`M${object} ${upper}H${lens}`} fill="none" stroke={ochre} strokeWidth="2.5" />
      <Arrow from={[lens,upper]} to={diverging ? [nearEnd,upper + height*(nearEnd-lens)/focal]
        : solved ? [image,tip] : [afterImage,tip+height*18/focal]} color={ochre} />
      {diverging && <path d={`M${lens} ${upper}L${lens+focal} ${axis}`} fill="none" stroke={teal} strokeWidth="1.9" strokeDasharray="4 4" />}
    </>}
    <Arrow from={[object,axis]} to={[object,upper]} color={plum} />
    {construction >= 2 && <Arrow from={[image,axis]} to={[image,tip]} color={teal} dashed={diverging} />}
    <circle cx={lens-focal} cy={axis} r="4" fill={ink} /><circle cx={lens+focal} cy={axis} r="4" fill={ink} />
    <text x={lens-Math.abs(focal)} y="127" textAnchor="middle">F</text><text x={lens+Math.abs(focal)} y="127" textAnchor="middle">F</text>
    <text x={object} y="171" textAnchor="middle" fill={plum}>Предмет</text>
    {solved ? <>
      <text x={image} y="35" textAnchor="middle" fill={teal}>Экран</text>
      <path d={`M${object} 187 H${image} M${object} 181V193 M${lens} 181V193 M${image} 181V193`} stroke={muted} fill="none" />
      <text x={(object+lens)/2} y="208" textAnchor="middle">30 см</text>
      <text x={(lens+image)/2} y="208" textAnchor="middle">60 см</text>
    </> : construction >= 2 && <circle cx={image} cy={tip} r="4" fill={teal} />}
  </Diagram>;
}

function LensRays() {
  const [type,setType] = useState("converging");
  const [step,setStep] = useState(0);
  const diverging = type === "diverging";
  let reading;
  if (step === 0) reading = "Луч через центр линзы идёт прямо.";
  else if (step === 1) reading = diverging
    ? "Пунктир проходит через ближний фокус. Где он пересекает центральный луч?"
    : "Второй луч проходит через дальний фокус. Найди, где он встретит первый луч.";
  else reading = diverging ? "Мнимое изображение прямое, со стороны предмета."
    : "Действительное изображение перевёрнуто, за линзой.";
  return <div className="lesson-figure-experiment lens-build" data-nodrag>
    <ToggleGroup type="single" value={type} onValueChange={value => { if(value) setType(value); }}
      aria-label="Линза на схеме" className="lesson-experiment-options lens-type-options">
      <ToggleGroupItem value="converging">Собирающая</ToggleGroupItem>
      <ToggleGroupItem value="diverging">Рассеивающая</ToggleGroupItem>
    </ToggleGroup>
    <LensConstruction diverging={diverging} construction={step} />
    <ToggleGroup type="single" value={String(step)} onValueChange={value => { if(value !== "") setStep(Number(value)); }}
      aria-label="Шаг построения" className="lesson-experiment-options lens-build-stages">
      <ToggleGroupItem value="0" aria-label="Первый луч">1 луч</ToggleGroupItem>
      <ToggleGroupItem value="1">Два луча</ToggleGroupItem>
      <ToggleGroupItem value="2" aria-label="Изображение">Итог</ToggleGroupItem>
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">
      {reading}
    </p>
  </div>;
}

const loadRatios = [.25, .5, 1, 2, 3, 4, 6];

function LoadPower() {
  const [selected, setSelected] = useState(2);
  const ratio = loadRatios[selected];
  const x = 45, bottom = 143, scale = 97;
  const toX = ratio => x + 47 * ratio;
  const toY = value => bottom - scale * value;
  const normalizedPower = value => 4 * value / (1 + value)**2;
  const efficiency = value => value / (1 + value);
  const power = curve(120, t => {
    const ratio = 6 * t;
    return [toX(ratio), toY(normalizedPower(ratio))];
  });
  const efficiencyCurve = curve(120, t => {
    const ratio = 6 * t;
    return [toX(ratio), toY(efficiency(ratio))];
  });
  const percentage = value => `${Math.round(value*100)}%`;
  const powerText = percentage(normalizedPower(ratio));
  const efficiencyText = percentage(efficiency(ratio));
  const ratioText = ratio.toLocaleString("ru");
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Отношение сопротивлений ${ratioText}. Мощность нагрузки ${powerText} от максимума, КПД ${efficiencyText}.`} viewBox="0 0 360 190">
      <Axes x={x} y={bottom} right={339} top={28} xlabel="R / r" />
      <path d={`M${x} ${toY(1)}H${toX(6)} M${x} ${toY(.5)}H${toX(6)}`} stroke={muted} strokeDasharray="3 5" opacity=".65" fill="none" />
      <path d={`M${toX(ratio)} 38V${bottom}`} stroke={muted} strokeWidth="1.6" strokeDasharray="4 4" fill="none" />
      <polyline points={power} stroke={ochre} strokeWidth="3" fill="none" />
      <polyline points={efficiencyCurve} stroke={teal} strokeWidth="3" fill="none" />
      <circle cx={toX(ratio)} cy={toY(normalizedPower(ratio))} r="5" fill={ochre} stroke="#fffdf9" strokeWidth="1.4" />
      <circle cx={toX(ratio)} cy={toY(efficiency(ratio))} r="5" fill={teal} stroke="#fffdf9" strokeWidth="1.4" />
      <text x={x-7} y={toY(1)+5} textAnchor="end">1</text>
      <text x={x-7} y={toY(.5)+5} textAnchor="end">½</text>
      <text x={toX(1)} y="165" textAnchor="middle">1</text>
      <text x="117" y="35" fill={ochre}>P / Pₘₐₓ</text>
      <text x="297" y="46" fill={teal}>КПД</text>
    </Diagram>
    <div className="lesson-reflection-control">
      <span>Отношение R/r</span><output>{ratioText}</output>
      <Slider value={[selected]} min={0} max={loadRatios.length-1} step={1} onValueChange={([value]) => setSelected(value)}
        className="lesson-reflection-slider" thumbProps={{"aria-label":"Отношение сопротивлений","aria-valuetext":ratioText}} />
    </div>
    <dl className="load-readout" aria-live="polite">
      <div><dt>От максимума мощности</dt><dd>{powerText}</dd></div>
      <div><dt>КПД источника</dt><dd>{efficiencyText}</dd></div>
    </dl>
  </div>;
}

function EyeFocus() {
  const [mode,setMode] = useState("myopia");
  const [glasses,setGlasses] = useState(false);
  const myopia = mode === "myopia";
  const axis = 101, retina = 275, eyeLens = 165, eyeglass = 113;
  const bareFocus = myopia ? 226 : 321;
  const focus = glasses ? retina : bareFocus;
  const correction = glasses ? 1/(retina-eyeLens) - 1/(bareFocus-eyeLens) : 0;
  const separation = eyeLens-eyeglass;
  const lensPower = correction/(1+separation*correction);
  const rayHeight = 22;
  const rayInEye = rayHeight*(1-separation*lensPower);
  const reading = glasses ? `Фокус на сетчатке. Линза ${myopia ? "рассеивающая" : "собирающая"}.`
    : myopia ? "Фокус перед сетчаткой." : "Без сетчатки лучи сошлись бы дальше.";
  return <div className="lesson-figure-experiment lesson-eye-experiment" data-nodrag>
    <ToggleGroup type="single" value={mode} onValueChange={value => { if(value) setMode(value); }}
      aria-label="Оптика глаза" className="lesson-experiment-options">
      <ToggleGroupItem value="myopia">Близорукость</ToggleGroupItem>
      <ToggleGroupItem value="hyperopia">Дальнозоркость</ToggleGroupItem>
    </ToggleGroup>
    <Diagram title={reading} viewBox="0 0 360 190">
      <path d="M137 101C162 44 223 47 256 72C270 81 275 90 275 101C275 112 270 121 256 130C223 155 162 158 137 101Z" fill={glasses ? "#dae9ef" : "#e8def3"} />
      <path d="M256 72C270 81 275 90 275 101C275 112 270 121 256 130" stroke={teal} strokeWidth="3" fill="none" />
      <path d="M165 69Q185 101 165 133Q147 101 165 69Z" fill="#c5dbe5" stroke={teal} strokeWidth="1.6" />
      {glasses && <path d={myopia ? "M102 54H124Q112 101 124 148H102Q114 101 102 54Z"
        : "M113 54Q134 101 113 148Q92 101 113 54Z"} fill="#d3e5ef" stroke={teal} strokeWidth="1.6" />}
      {[1,-1].map(sign => {
        const yBefore = axis+sign*rayHeight, yLens = axis+sign*rayInEye;
        const hitRetinaY = axis+sign*rayInEye*(focus-retina)/(focus-eyeLens);
        return <g key={sign}>
          <path d={`M25 ${yBefore}H${eyeglass}L${eyeLens} ${yLens}L${retina} ${hitRetinaY}`} fill="none" stroke={ochre} strokeWidth="2" strokeLinejoin="round" />
          {focus > retina && <path d={`M${retina} ${hitRetinaY}L${focus} ${axis}`} fill="none" stroke={ochre} strokeWidth="1.6" strokeDasharray="4 4" />}
        </g>;
      })}
      <circle cx={focus} cy={axis} r="4" fill={plum} />
      <text x="279" y="50" textAnchor="middle" fill={teal}>Сетчатка</text>
      <path d="M279 56L269 79" stroke={teal} strokeWidth="1.4" />
      {glasses && <text x={eyeglass} y="173" textAnchor="middle" fill={teal}>Очки</text>}
      <text x="165" y="173" textAnchor="middle">Глаз</text>
    </Diagram>
    <ToggleGroup type="single" value={glasses ? "on" : "off"} onValueChange={value => { if(value) setGlasses(value === "on"); }}
      aria-label="Линза перед глазом" className="lesson-experiment-options">
      <ToggleGroupItem value="off">Без очков</ToggleGroupItem>
      <ToggleGroupItem value="on">С очками</ToggleGroupItem>
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">{reading}</p>
  </div>;
}

function InterferencePhase() {
  const [halfWave,setHalfWave] = useState(false);
  const left = 33, span = 246;
  const wave = t => Math.sin(4*Math.PI*t);
  const otherWave = t => (halfWave ? -1 : 1)*wave(t);
  const segments = [
    { label:"Первая волна", y:56, labelY:32, color:plum, value:wave, width:2.5 },
    { label:"Вторая волна", y:118, labelY:94, color:teal, value:otherWave, width:2.5 },
    { label:"Сумма", y:194, labelY:157, color:ochre, value:t => wave(t)+otherWave(t), width:3 },
  ];
  const reading = halfWave ? "Колебания гасят друг друга. Тёмная полоса." : "Амплитуда удвоилась. Светлая полоса.";
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Две когерентные волны в одной точке экрана. ${reading}`} viewBox="0 0 360 250">
      {segments.map(({label,y,labelY,color,value,width}) => <g key={label}>
        <text x={left} y={labelY} fill={color}>{label}</text>
        <path d={`M${left} ${y}H${left+span}`} fill="none" stroke={muted} strokeWidth="1.15" strokeDasharray="3 4" />
        <polyline points={curve(96,t => [left+span*t,y-15*value(t)])} fill="none" stroke={color} strokeWidth={width} />
      </g>)}
      <rect x="299" y="153" width="33" height="75" rx="9" fill={halfWave ? "#544566" : "#f2c36c"} />
      <text x="278" y="244" textAnchor="end">Время</text>
    </Diagram>
    <ToggleGroup type="single" value={halfWave ? "half" : "zero"} onValueChange={value => { if(value) setHalfWave(value === "half"); }}
      aria-label="Разность хода" className="lesson-experiment-options">
      <ToggleGroupItem value="zero">В фазе</ToggleGroupItem>
      <ToggleGroupItem value="half">Сдвиг на λ/2</ToggleGroupItem>
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">{reading}</p>
  </div>;
}

function GratingOrders() {
  const center = 128;
  const grating = 164;
  const screen = 34;
  const toX = sine => center + (grating - screen) * sine / Math.sqrt(1 - sine * sine);
  const positions = [-.5, -.25, 0, .25, .5];
  return <Diagram title="Пять направлений главных максимумов от решётки. Центральный порядок прямо по оси. Второй порядок виден слева и справа под углами 30 градусов к оси." viewBox="0 0 258 222">
    <path d="M37 34H219" stroke={muted} strokeWidth="2.6" strokeLinecap="round" />
    {positions.map((sine, index) => {
      const secondOrder = Math.abs(sine) === .5;
      const color = secondOrder ? plum : muted;
      return <g key={sine}>
        <path d={`M${center} ${grating}L${toX(sine)} ${screen}`} stroke={color} strokeWidth={secondOrder ? 2.7 : 1.6} />
        <circle cx={toX(sine)} cy={screen} r={secondOrder ? 4.5 : 3} fill={color} />
        <text x={toX(sine)} y="23" textAnchor="middle" fontWeight={secondOrder ? 720 : 550} fill={secondOrder ? plum : ink}>{["−2", "−1", "0", "+1", "+2"][index]}</text>
      </g>;
    })}
    <path d="M128 117A47 47 0 0 1 151.5 123.3" fill="none" stroke={ochre} strokeWidth="2" />
    <text x="170" y="123" fill={ochre}>30°</text>
    <path d="M37 164H172" stroke={ink} strokeWidth="2" strokeDasharray="7 8" />
    <Arrow from={[128,215]} to={[128,172]} color={teal} />
    <text x="251" y="63" textAnchor="end" fill="#685176">Экран</text>
    <text x="252" y="171" textAnchor="end">Решётка</text>
    <text x="14" y="215" fill={teal}>Свет</text>
  </Diagram>;
}

function SlitWidth() {
  const [width, setWidth] = useState(.2);
  const wavelength = .00055;
  const screenDistance = 1500;
  const firstMinimum = screenDistance * Math.tan(Math.asin(wavelength / width));
  const toX = mm => 180 + mm * 9.6;
  const plot = curve(180, t => {
    const mm = (t - .5) * 28;
    const phase = Math.PI * width * mm / (wavelength * Math.hypot(mm, screenDistance));
    const relativeIntensity = Math.abs(phase) < 1e-6 ? 1 : (Math.sin(phase) / phase) ** 2;
    return [toX(mm), 134 - 91 * relativeIntensity];
  });
  const widthLabel = width.toFixed(2).replace(".", ",");
  const bandLabel = (2 * firstMinimum).toFixed(1).replace(".", ",");
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Дифракция на щели шириной ${widthLabel} миллиметра. Центральная полоса шириной ${bandLabel} миллиметра.`} viewBox="0 0 360 188">
      <path d="M45 134 H327" stroke={muted} strokeWidth="1.5" />
      <text x="180" y="23" textAnchor="middle" fill={ink}>Интенсивность</text>
      <path d={`M${toX(-14)},134 L${plot.replaceAll(" ", " L")} L${toX(14)},134 Z`} fill="#ded1f1" />
      <polyline points={plot} fill="none" stroke={plum} strokeWidth="2.7" />
      {[-1, 1].map(sign => {
        const x = toX(sign * firstMinimum);
        return <g key={sign}>
          <path d={`M${x} 72 V153`} stroke={ochre} strokeDasharray="4 5" />
          <circle cx={x} cy="134" r="3.5" fill={ochre} />
        </g>;
      })}
      <text x="180" y="175" textAnchor="middle" fill={ink}>Первые минимумы</text>
      <text x="326" y="175" textAnchor="end" fill={ink}>x, мм</text>
    </Diagram>
    <div className="lesson-reflection-control">
      <span>Ширина щели</span><output>{widthLabel} мм</output>
      <Slider value={[width]} min={.1} max={.4} step={.05} onValueChange={([value]) => setWidth(value)}
        className="lesson-reflection-slider" thumbProps={{"aria-label":"Ширина щели","aria-valuetext":`${widthLabel} мм`}} />
      <p className="lesson-ray-reading" aria-live="polite">Центральная полоса шириной {bandLabel} мм.</p>
    </div>
  </div>;
}

function LightClock() {
  const [speed,setSpeed] = useState(0.6);
  const gamma = 1/Math.sqrt(1-speed**2);
  const gap = 47, bottom = 123, top = bottom-gap, platform = 249;
  const travel = gap * speed * gamma;
  const platformTime = gamma.toLocaleString("ru",{maximumFractionDigits:2});
  const passenger = [[70,bottom],[70,top],[70,bottom]];
  const fromPlatform = [[platform-travel,bottom],[platform,top],[platform+travel,bottom]];
  return <div className="lesson-figure-experiment lesson-light-clock" data-nodrag>
    <Diagram title={`Событие 1: луч ушёл. Событие 2: луч вернулся. В вагоне они в одном месте, между ними 1 нс. На платформе ${platformTime} нс.`} viewBox="0 0 360 170">
      <rect x="15" y="19" width="111" height="141" rx="14" fill="#f6ebf4" />
      <rect x="137" y="19" width="208" height="141" rx="14" fill="#e6edf6" />
      <text x="70" y="46" textAnchor="middle" fill={plum}>В вагоне</text>
      <text x={platform} y="46" textAnchor="middle" fill={teal}>На платформе</text>
      {[passenger,fromPlatform].map(([start,turn,finish]) => {
        const sameSpot = start[0] === finish[0];
        return <g key={start[0]}>
          <path d={`M${start[0]-13} ${bottom}h26 M${turn[0]-13} ${top}h26 ${sameSpot ? "" : `M${finish[0]-13} ${bottom}h26`}`}
            stroke={teal} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          {sameSpot ? <>
            <Arrow from={[start[0]-4,bottom-5]} to={[start[0]-4,top+5]} color={ochre} />
            <Arrow from={[start[0]+4,top+5]} to={[start[0]+4,bottom-5]} color={ochre} />
          </> : <>
            <Arrow from={start} to={turn} color={ochre} />
            <Arrow from={turn} to={finish} color={ochre} />
          </>}
          <line x1={start[0]} x2={finish[0]} y1="139" y2="139" stroke="#7a6588" strokeDasharray="3 4" />
          {(sameSpot ? [{x:start[0], text:"1 и 2"}] : [{x:start[0],text:"1"},{x:finish[0],text:"2"}])
            .map(event => <g key={event.text}>
              <circle cx={event.x} cy={bottom} r="3.5" fill="#966242" />
              <text x={event.x} y="153" fill={plum} textAnchor="middle" fontSize="18">{event.text}</text>
            </g>)}
        </g>;
      })}
    </Diagram>
    <ToggleGroup type="single" value={String(speed)} onValueChange={value => { if (value) setSpeed(Number(value)); }}
      aria-label="Скорость вагона" className="lesson-experiment-options">
      <ToggleGroupItem value="0">Стоит</ToggleGroupItem>
      <ToggleGroupItem value="0.6">0,6 c</ToggleGroupItem>
      <ToggleGroupItem value="0.8">0,8 c</ToggleGroupItem>
    </ToggleGroup>
    <dl className="lesson-contour-readings" aria-live="polite">
      <div><dt>В вагоне</dt><dd>1 нс</dd></div>
      <div><dt>На платформе</dt><dd>{platformTime} нс</dd></div>
    </dl>
    <p className="clock-events"><span><b>1</b> Луч ушёл</span><span><b>2</b> Луч вернулся</span></p>
  </div>;
}

function PhotonCount() {
  return <Diagram title="Два пучка одной частоты. За одинаковое время в первом пришло три фотона, во втором шесть. Энергия одного фотона одинакова." viewBox="0 0 360 182">
    {[{y:55,num:3,tag:"Слабый"},{y:121,num:6,tag:"Яркий"}].map(({y,num,tag}) => <g key={y}>
      <path d={`M104 ${y}H323`} stroke="#cbbad5" strokeDasharray="3 6" />
      <text x="25" y={y+5}>{tag}</text>
      {Array.from({length:num},(_,i)=><circle key={i} cx={118+i*37} cy={y} r="8" fill="#e9bd73" stroke={ochre} strokeWidth="1.6" />)}
    </g>)}
    <text x="180" y="163" textAnchor="middle">За один и тот же интервал</text>
  </Diagram>;
}

function PhotonMomentum() {
  const [surface,setSurface] = useState("absorber");
  const mirror = surface === "mirror";
  const reading = mirror ? "Зеркало получает импульс 2p вправо." : "Поглотитель получает импульс p вправо.";
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Фотон падает перпендикулярно поверхности слева. ${reading}`} viewBox="0 0 360 191">
      <path d="M225 23h24v122h-24z" fill={mirror ? "#c3d6e8" : "#544768"} />
      {mirror && <path d="M226 25V143" stroke={teal} strokeWidth="3" />}
      <path d="M37 54q7-13 14 0t14 0t14 0t14 0" stroke={ochre} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Arrow from={[103,54]} to={[219,54]} color={ochre} />
      <text x="157" y="38" textAnchor="middle" fill={ochre}>p</text>
      {mirror && <>
        <Arrow from={[220,103]} to={[107,103]} color={teal} />
        <text x="157" y="123" textAnchor="middle" fill={teal}>отражение</text>
      </>}
      <Arrow from={[238,157]} to={[mirror ? 327 : 282,157]} color={plum} />
      <text x="238" y="181" textAnchor="middle" fill={plum}>{mirror ? "2p" : "p"} поверхности</text>
    </Diagram>
    <ToggleGroup type="single" value={surface} onValueChange={value => { if (value) setSurface(value); }}
      aria-label="Поверхность" className="lesson-experiment-options">
      <ToggleGroupItem value="absorber">Поглотитель</ToggleGroupItem>
      <ToggleGroupItem value="mirror">Зеркало</ToggleGroupItem>
    </ToggleGroup>
    <dl className="photon-impact" aria-live="polite" aria-label="Проекции импульса на ось вправо">
      <div><dt>Фотон до</dt><dd>+p</dd></div>
      <div><dt>Фотон после</dt><dd>{mirror ? "−p" : "0"}</dd></div>
      <div><dt>Передано поверхности</dt><dd>{mirror ? "+2p" : "+p"}</dd></div>
    </dl>
  </div>;
}

const planckEvPerFrequencyUnit = 0.414;
const workFunctions = [2.3,3.1];

function PhotoThreshold() {
  const [work,setWork] = useState(workFunctions[0]);
  const threshold = work/planckEvPerFrequencyUnit;
  const otherWork = workFunctions.find(value => value !== work);
  const toX = f => 43+(f-3)*39;
  const bottom = 146, limit = 10;
  const readThreshold = threshold.toLocaleString("ru",{maximumFractionDigits:2});
  const line = (value,color,active) => {
    const start = toX(value/planckEvPerFrequencyUnit);
    const end = bottom-57*(planckEvPerFrequencyUnit*limit-value);
    return <g>
      <path d={`M${start} ${bottom} L${toX(limit)} ${end}`} stroke={color} strokeWidth={active ? 3.2 : 2}
        strokeDasharray={active ? undefined : "5 5"} strokeLinecap="round" fill="none" />
      {active && <circle cx={start} cy={bottom} r="5" fill={ochre} />}
    </g>;
  };
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Пороговая частота выбранного металла ${readThreshold} на десять в четырнадцатой степени герц.`} viewBox="0 0 360 201">
      <path d={`M43 39H${toX(threshold)}V${bottom}H43Z`} fill="#e4d9ee" />
      <Arrow from={[43,bottom]} to={[332,bottom]} color={ink} />
      <Arrow from={[43,bottom]} to={[43,28]} color={ink} />
      <text x="34" y="20">Kₘₐₓ, эВ</text>
      <text x="34" y="151" textAnchor="end">0</text>
      <text x="34" y="94" textAnchor="end">1</text>
      <path d="M43 89H314" stroke={muted} strokeDasharray="3 4" fill="none" opacity=".65" />
      {[4,6,8,10].map(f => <g key={f}>
        <path d={`M${toX(f)} 146v5`} stroke={muted} />
        <text x={toX(f)} y="171" textAnchor="middle">{f}</text>
      </g>)}
      {line(otherWork,teal,false)}
      {line(work,plum,true)}
      <text x="323" y="192" textAnchor="end">f, 10¹⁴ Гц</text>
    </Diagram>
    <ToggleGroup type="single" value={String(work)} onValueChange={value => { if (value) setWork(Number(value)); }}
      aria-label="Работа выхода" className="lesson-experiment-options">
      {workFunctions.map(value => <ToggleGroupItem key={value} value={String(value)}>{value.toLocaleString("ru")} эВ</ToggleGroupItem>)}
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">Порог {readThreshold} · 10¹⁴ Гц</p>
  </div>;
}

const photoBeam = [
  {frequency:4, color:"#935e7f"},
  {frequency:6, color:"#a0642e"},
  {frequency:8, color:"#7956a0"},
];
const beamPulses = [
  {value:"dim", label:"Слабый свет", heights:[104]},
  {value:"bright", label:"Яркий свет", heights:[88,104,120]},
];

function PhotoCurrent() {
  const [beamIndex, setBeamIndex] = useState(2);
  const [brightness, setBrightness] = useState("dim");
  const beam = photoBeam[beamIndex];
  const pulses = beamPulses.find(pulse => pulse.value === brightness);
  const workEv = workFunctions[0];
  const energy = planckEvPerFrequencyUnit * beam.frequency - workEv;
  const hasEmission = energy >= 0;
  const speed = Math.sqrt(Math.max(energy, 0));
  const energyLabel = energy.toLocaleString("ru", { maximumFractionDigits:2 });
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Свет падает на металл. ${hasEmission ? "С поверхности выходят электроны." : "Электроны не выходят."}`} viewBox="0 0 360 174">
      <rect x="155" y="47" width="33" height="94" rx="10" fill="#ae90c0" stroke={plum} strokeWidth="2" />
      <text x="171" y="162" textAnchor="middle">Металл</text>
      {pulses.heights.map(y => <g key={y}>
        <polyline points={curve(96,t => [31+107*t,y-4.8*Math.sin(2*Math.PI*107*t*beam.frequency/144)])}
          stroke={beam.color} strokeWidth="2.3" fill="none" />
        <Arrow from={[138,y]} to={[152,y]} color={beam.color} />
        {hasEmission && <Arrow from={[192,y]} to={[192+84*speed,y]} color={teal} />}
      </g>)}
      <text x="80" y="40" textAnchor="middle" fill={beam.color}>Свет</text>
      <text x="270" y="40" textAnchor="middle" fill={teal}>{hasEmission ? "Электроны" : "Выхода нет"}</text>
    </Diagram>
    <div className="lesson-photo-control">
      <span>Частота света</span>
      <ToggleGroup type="single" value={String(beamIndex)} onValueChange={value => { if (value) setBeamIndex(Number(value)); }}
        aria-label="Частота света" className="lesson-experiment-options">
        {photoBeam.map(({frequency},index)=><ToggleGroupItem key={frequency} value={String(index)}
          aria-label={frequency + " на 10 в четырнадцатой степени герц"}>{frequency}</ToggleGroupItem>)}
      </ToggleGroup>
      <span className="lesson-photo-unit">× 10¹⁴ Гц</span>
    </div>
    <ToggleGroup type="single" value={brightness} onValueChange={value => { if (value) setBrightness(value); }}
      aria-label="Яркость света" className="lesson-experiment-options photo-brightness-options">
      {beamPulses.map(({value,label}) => <ToggleGroupItem key={value} value={value} aria-label={label}>
        {value === "dim" ? "Слабый" : "Яркий"}
      </ToggleGroupItem>)}
    </ToggleGroup>
    <p className="photo-emission" role="status" data-emits={hasEmission}>
      {hasEmission ? <>Максимальная энергия <b>{energyLabel} эВ</b></> : <>Ниже порога. <b>Электронов нет.</b></>}
    </p>
  </div>;
}

function PolarizedPaper() {
  return <Diagram title="Отрицательно заряженный шарик смещает связанные заряды в бумаге. Ближе к шарику оказываются положительные стороны молекул, дальше отрицательные. Бумага остаётся нейтральной." viewBox="0 0 360 180">
    <path d="M21 48Q89 14 124 66Q141 114 97 152L40 154Q12 137 21 48Z" fill="#b88dbf" stroke={plum} strokeWidth="2" />
    <text x="72" y="99" textAnchor="middle" fill="#352443" fontSize="32">−</text>
    <path d="M190 51L316 57L320 138L181 129Z" fill="#fff8ec" stroke={ochre} strokeWidth="2" />
    {[75,102].map(y => [211,251,291].map(x => <g key={x+"-"+y}>
      <path d={`M${x-10} ${y} H${x+10}`} stroke={muted} strokeWidth="1.4" />
      <circle cx={x-10} cy={y} r="8" fill="#f1c07f" />
      <circle cx={x+10} cy={y} r="8" fill="#ded0ed" />
      <text x={x-10} y={y+5} textAnchor="middle" fill={ink}>+</text>
      <text x={x+10} y={y+5} textAnchor="middle" fill={ink}>−</text>
    </g>))}
    <text x="70" y="173" textAnchor="middle">Шарик</text>
    <text x="254" y="162" textAnchor="middle">Бумага</text>
  </Diagram>;
}

const hydrogenLevels = [
  {n:3, wavelength:656, color:"#ff8c82", tint:"#f7ddd5"},
  {n:4, wavelength:486, color:"#88e6df", tint:"#d7f0e9"},
  {n:5, wavelength:434, color:"#93acff", tint:"#e5e9fc"},
  {n:6, wavelength:410, color:"#cd9dff", tint:"#eedff8"},
];
const hydrogenEnergy = n => -13.6 / n ** 2;

function AtomLevels() {
  const [selected,setSelected] = useState("3");
  const chosen = hydrogenLevels.find(item => item.n === Number(selected));
  const X = wavelength => (wavelength - 400) / 280 * 100;
  const Y = energy => 30 - energy * 44;
  const originY = Y(hydrogenEnergy(chosen.n));
  const targetY = Y(hydrogenEnergy(2));
  const energy = (hydrogenEnergy(chosen.n) - hydrogenEnergy(2)).toLocaleString("ru",{minimumFractionDigits:2,maximumFractionDigits:2});
  return <div className="hydrogen-bench" style={{"--photon":chosen.color,"--photon-wash":chosen.tint}} data-nodrag>
    <ToggleGroup type="single" value={selected} onValueChange={value => { if (value) setSelected(value); }}
      aria-label="Переход водорода" className="hydrogen-controls">
      {hydrogenLevels.map(({n,tint}) => <ToggleGroupItem key={n} value={String(n)} style={{"--line-tint":tint}}>{n} → 2</ToggleGroupItem>)}
    </ToggleGroup>
    <div className="hydrogen-readout">
      <Diagram title={`Энергетические уровни водорода. Переход с уровня ${chosen.n} на уровень 2.`} viewBox="0 0 300 196">
        <path d="M38 184V29" stroke={muted} strokeWidth="1.5" />
        <text x="15" y="20">E, эВ</text>
        {[0,-1,-2,-3].map(e => <g key={e}>
          <path d={`M33 ${Y(e)}H43`} stroke={muted} strokeWidth="1.5" />
          <text x="27" y={Y(e)+5} textAnchor="end">{e === 0 ? "0" : "−" + Math.abs(e)}</text>
        </g>)}
        <path d={`M49 ${targetY}H227`} stroke={plum} strokeWidth="2.6" />
        <text x="237" y={targetY+5}>n = 2</text>
        {hydrogenLevels.map(({n}) => <path key={n} d={`M49 ${Y(hydrogenEnergy(n))}H227`} stroke={muted} strokeWidth="1.4" />)}
        <path d={`M49 ${originY}H227`} stroke={plum} strokeWidth="2.6" />
        <text x="237" y={originY+5}>n = {chosen.n}</text>
        <Arrow from={[156,originY+2]} to={[156,targetY-3]} color="#724577" outline="#f7eff8" />
      </Diagram>
      <div className="hydrogen-spectrum">
        <div className="hydrogen-lines" aria-hidden="true">
          {hydrogenLevels.map(line => <i key={line.n} data-selected={line.n === chosen.n || undefined}
            style={{left:`${X(line.wavelength)}%`,"--line":line.color}} />)}
        </div>
        <div className="hydrogen-scale" aria-hidden="true"><span>400 нм</span><span>680 нм</span></div>
        <div className="hydrogen-measure" role="status">
          <p><b>{chosen.wavelength} нм</b><span>Длина волны</span></p>
          <p><b>{energy} эВ</b><span>Энергия фотона</span></p>
        </div>
      </div>
    </div>
  </div>;
}

function GoldFoil() {
  const middle = [178,97], radius = 65;
  const rebound = [119,125];
  return <Diagram title="Альфа-частицы летят слева к тонкой золотой фольге. Основная часть почти не отклоняется. У малого числа частиц направление сильно меняется, некоторые летят назад." viewBox="0 0 360 218">
    <path d="M118 72A65 65 0 1 1 118 122" fill="none" stroke={plum} strokeWidth="4.2" strokeLinecap="round" />
    <path d={`M${middle[0]} 68V126`} stroke={ochre} strokeWidth="6" strokeLinecap="round" />
    <path d="M121 65L108 39H76 M178 128v41" stroke={muted} strokeWidth="1.4" fill="none" />
    <text x="76" y="29" fill={plum}>Экран</text>
    <text x="178" y="191" textAnchor="middle" fill={ochre}>Золотая фольга</text>
    <text x="36" y="60" fill={teal}>Пучок α</text>
    {[81,97,113].map(y => {
      const end = middle[0] + Math.sqrt(radius**2-(y-middle[1])**2);
      return <g key={y}>
        <Arrow from={[37,y]} to={[end-6,y]} color={teal} />
        <circle cx={end} cy={y} r="3.5" fill={teal} />
      </g>;
    })}
    <path d="M37 105H174" stroke={ochre} strokeWidth="1.7" strokeDasharray="4 4" fill="none" />
    <Arrow from={[174,105]} to={rebound} color={ochre} />
    <circle cx={rebound[0]} cy={rebound[1]} r="3.5" fill={ochre} />
    <path d="M75 149L110 132" stroke={ochre} strokeWidth="1.4" fill="none" />
    <text x="18" y="170" fill={ochre}>Редкий отскок</text>
  </Diagram>;
}

function StoppingEnergy() {
  const electronEnergy = 3.2;
  const [volts,setVolts] = useState(0);
  const remaining = Math.max(0,electronEnergy-1.6*volts);
  const stopped = volts >= 2;
  const x = 42, length = 275, bottom = 141, up = value => bottom-value*30;
  const ending = stopped ? x+length*2/volts : x+length;
  const voltage = volts.toLocaleString("ru");
  const reading = stopped ? "Фототок исчез. Запирающее напряжение 2 В."
    : `Электрон долетает. Остаток энергии ${remaining.toLocaleString("ru",{maximumFractionDigits:2})} · 10⁻¹⁹ Дж.`;
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={`Тормозящее напряжение ${voltage} вольта. ${reading}`} viewBox="0 0 360 200">
      <path d={`M${x} ${bottom}H${x+length} M${x} 27V${bottom}`} stroke={muted} strokeWidth="1.5" fill="none" />
      <path d={`M${x} ${up(electronEnergy)}H${x+length}`} stroke={muted} strokeDasharray="4 4" fill="none" />
      <text x="31" y={up(electronEnergy)+5} textAnchor="end">3,2</text>
      <text x="31" y={bottom+5} textAnchor="end">0</text>
      <text x={x} y="19" fill={plum}>K, 10⁻¹⁹ Дж</text>
      <path d={`M${ending} ${up(remaining)}V${bottom}`} stroke={teal} strokeWidth="1.6" strokeDasharray="4 4" fill="none" />
      <Arrow from={[x,up(electronEnergy)]} to={[ending,up(remaining)]} color={plum} />
      <circle cx={ending} cy={up(remaining)} r="4.4" fill={teal} />
      <text x={x} y="167" textAnchor="middle">Старт</text>
      <text x="332" y="167" textAnchor="end">Коллектор</text>
      <text x="180" y="193" textAnchor="middle" fill={muted}>Путь между электродами</text>
    </Diagram>
    <div className="lesson-reflection-control">
      <span>Тормозящее напряжение</span><output>{voltage} В</output>
      <Slider value={[volts]} min={0} max={3} step={.5} onValueChange={([value]) => setVolts(value)}
        className="lesson-reflection-slider" thumbProps={{"aria-label":"Тормозящее напряжение","aria-valuetext":`${voltage} В`}} />
      <p className="lesson-ray-reading" aria-live="polite">{reading}</p>
    </div>
  </div>;
}

const hydrogenNuclei = [
  { name: "Водород-1", marks: [[87,71,true]] },
  { name: "Дейтерий", marks: [[68,67,true],[105,76,false]] },
  { name: "Тритий", marks: [[85,48,true],[66,82,false],[105,83,false]] },
];

function HydrogenIsotopes() {
  const [index, setIndex] = useState(0);
  const { name, marks } = hydrogenNuclei[index];
  return <div className="lesson-figure-experiment" data-nodrag>
    <Diagram title={name + ". В ядре один протон. Число нейтронов " + index + "."} viewBox="0 0 360 141">
      <rect x="22" y="16" width="128" height="109" rx="32" fill="#f9f0e8" />
      {marks.map(([x,y,isProton]) => <g key={x}>
        <circle cx={x} cy={y} r="19" fill={isProton ? "#f2c9a7" : "#d7e8e9"} stroke={isProton ? ochre : teal} strokeWidth="2" />
        <text x={x} y={y+6} fill={isProton ? ochre : teal} fontWeight="650" textAnchor="middle">{isProton ? "+" : "0"}</text>
      </g>)}
      <text x="190" y="48" textAnchor="end" fill={plum} fontWeight="650">{marks.length}</text>
      <text x="190" y="86" textAnchor="end" fill={ochre} fontWeight="650">1</text>
      <text x="203" y="83" fontSize="42" fontWeight="600">H</text>
      <path d="M198 43H248 M198 93H248" stroke={muted} strokeWidth="1.2" strokeDasharray="4 4" />
      <text x="255" y="49" fill={plum}>A, нуклоны</text>
      <text x="255" y="99" fill={ochre}>Z, протоны</text>
    </Diagram>
    <ToggleGroup type="single" value={String(index)} onValueChange={value => { if (value) setIndex(Number(value)); }}
      aria-label="Изотоп водорода" className="lesson-experiment-options">
      {hydrogenNuclei.map((isotope,i) => <ToggleGroupItem key={isotope.name} value={String(i)}>{isotope.name}</ToggleGroupItem>)}
    </ToggleGroup>
    <p className="lesson-experiment-result" aria-live="polite">Протонов 1 · нейтронов {index}</p>
  </div>;
}

function Binding() {
  return <Diagram title="Для полного разделения связанного ядра на свободные нуклоны нужно подвести энергию связи." viewBox="0 0 360 202">
    <g strokeWidth="2">
      <circle cx="81" cy="93" r="22" fill="#f4c69e" stroke={ochre} />
      <circle cx="105" cy="111" r="22" fill="#cbdbe9" stroke={teal} />
      <circle cx="248" cy="83" r="21" fill="#f4c69e" stroke={ochre} />
      <circle cx="294" cy="111" r="21" fill="#cbdbe9" stroke={teal} />
    </g>
    <Arrow from={[137,100]} to={[216,100]} color={plum} />
    <text x="177" y="76" textAnchor="middle" fill={plum}>Энергия</text>
    <text x="177" y="92" textAnchor="middle" fill={plum}>связи</text>
    <text x="91" y="162" textAnchor="middle">Ядро дейтерия</text>
    <text x="269" y="162" textAnchor="middle">Протон и нейтрон</text>
  </Diagram>;
}

const deuteriumMasses = [
  { name:"Протон", mass:938.272 },
  { name:"Нейтрон", mass:939.565 },
  { name:"Ядро дейтерия", mass:1875.613 },
];
const massLabel = value => value.toLocaleString("ru", { minimumFractionDigits:3, maximumFractionDigits:3 });

function MassDifference() {
  const [differenceVisible, setDifferenceVisible] = useState(false);
  const freeMass = deuteriumMasses[0].mass + deuteriumMasses[1].mass;
  const boundMass = deuteriumMasses[2].mass;
  return <div className="mass-difference" data-nodrag>
    <table className="mass-comparison">
      <caption>Масса, МэВ/c²</caption>
      <tbody>
        {deuteriumMasses.slice(0,2).map(item => <tr key={item.name}><th scope="row">{item.name}</th><td>{massLabel(item.mass)}</td></tr>)}
        <tr className="free-mass"><th scope="row">Сумма свободных</th><td>{massLabel(freeMass)}</td></tr>
        <tr><th scope="row">{deuteriumMasses[2].name}</th><td>{massLabel(boundMass)}</td></tr>
      </tbody>
    </table>
    <Button type="button" variant="secondary" className="mass-difference-button" aria-expanded={differenceVisible}
      onClick={() => setDifferenceVisible(value => !value)}>
      {differenceVisible ? "Скрыть разность" : "Найти разность"}
    </Button>
    <div className="mass-gap" aria-live="polite">
      {differenceVisible && <>
        <p>{massLabel(freeMass)} − {massLabel(boundMass)} = <b>{massLabel(freeMass-boundMass)} МэВ/c²</b></p>
        <p>Для разделения ядра нужно <b>{massLabel(freeMass-boundMass)} МэВ</b>.</p>
      </>}
    </div>
  </div>;
}

const decayTimes = ["0", "T", "2T", "3T"];
const sampleSize = 24;
const decaySample = () => Array.from({ length: sampleSize }, () => Math.random());

function HalfLife() {
  const [periods, setPeriods] = useState(0);
  const [sample, setSample] = useState(decaySample);
  const fraction = 2 ** -periods;
  const expected = sampleSize * fraction;
  const remaining = sample.filter(rank => rank < fraction).length;
  const xAt = periods => 46 + 85 * periods;
  const yAt = fraction => 176 - 135 * fraction;
  const pointX = xAt(periods), pointY = yAt(fraction);
  return <div className="lesson-figure-experiment lesson-decay" data-nodrag>
    <Diagram title="График среднего числа исходных ядер. За каждый период полураспада среднее уменьшается вдвое." viewBox="0 0 360 214">
      <Axes x={46} y={176} right={335} top={26} xlabel="t" ylabel="N" />
      <polyline points={curve(60,u=>[xAt(3*u),yAt(2**(-3*u))])} fill="none" stroke={plum} strokeWidth="3.5" strokeLinecap="round" />
      {decayTimes.map((label,i) => <g key={label}>
        {i > 0 && <path d={`M${xAt(i)} 170V181`} stroke={muted} strokeWidth="1.5" />}
        {i > 0 && <text x={xAt(i)} y="200" textAnchor="middle">{label}</text>}
      </g>)}
      <path d={`M46 ${pointY}H${pointX}V176`} fill="none" stroke={muted} strokeDasharray="4 5" />
      <text x="34" y={pointY+5} textAnchor="end">{expected}</text>
      <circle cx={pointX} cy={pointY} r="5.5" fill={ochre} />
    </Diagram>
    <ToggleGroup type="single" value={String(periods)} onValueChange={value => { if (value) setPeriods(Number(value)); }}
      aria-label="Прошедшее время" className="lesson-experiment-options">
      {decayTimes.map((label,i) => <ToggleGroupItem key={label} value={String(i)}>{label}</ToggleGroupItem>)}
    </ToggleGroup>
    <div className="lesson-decay-sample">
      <div className="lesson-decay-dots" aria-hidden="true">
        {sample.map((rank,i) => <span key={i} data-remaining={rank < fraction} />)}
      </div>
      <Button type="button" variant="secondary" className="lesson-decay-button" onClick={() => setSample(decaySample())}>
        Новая проба
      </Button>
    </div>
    <p className="lesson-experiment-result" aria-live="polite">В пробе осталось {remaining}. В среднем {expected}.</p>
  </div>;
}

function HalfLifeSteps() {
  return <dl className="lesson-halving">
    {[1600,800,400,200].map((count,i) => <div key={count}>
      <dt>{i * 2} ч</dt>
      <dd>
        <span>{count.toLocaleString("ru")} тыс.</span>
        <span aria-hidden="true" className="lesson-halving-track"><span style={{width: `${count/16}%`}} /></span>
      </dd>
    </div>)}
  </dl>;
}

function Reflection() {
  const [angle, setAngle] = useState(35);
  const radians = angle * Math.PI / 180;
  const contact = [180, 158];
  const endpoint = (radius, side) => [contact[0] + side * radius * Math.sin(radians), contact[1] - radius * Math.cos(radians)];
  const [lx, ly] = endpoint(47, -1), [rx, ry] = endpoint(47, 1);
  return <div className="lesson-reflection" data-nodrag>
    <Diagram title={`Луч падает под углом ${angle} градусов к нормали и отражается под тем же углом.`} viewBox="0 0 360 205">
      <LessonProp name="mirror-edge" x={170} y={16} width={16} height={304} fit="none" transform="rotate(90 180 168)" />
      <path d="M 28 158 H 332" stroke={plum} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="180" x2="180" y1="18" y2="158" stroke={muted} strokeWidth="1.5" strokeDasharray="5 5" />
      <path d="M 180 144 H 194 V 158" fill="none" stroke={muted} strokeWidth="1.4" />
      <Arrow from={endpoint(132, -1)} to={contact} color={ochre} />
      <Arrow from={contact} to={endpoint(132, 1)} color={teal} />
      <path d={`M ${lx} ${ly} A 47 47 0 0 1 180 111 A 47 47 0 0 1 ${rx} ${ry}`} fill="none" stroke={plum} strokeWidth="1.6" />
      <text x="181" y="14" textAnchor="middle" fill={ink}>Нормаль</text>
      <text x="165" y="103" textAnchor="end" fill={ochre}>{angle}°</text>
      <text x="195" y="103" fill={teal}>{angle}°</text>
      <text x="180" y="198" textAnchor="middle" fill={ink}>Зеркало</text>
    </Diagram>
    <div className="lesson-reflection-control">
      <span>Угол падения</span><output>{angle}°</output>
      <Slider value={[angle]} min={10} max={70} step={5} onValueChange={([value]) => setAngle(value)}
        className="lesson-reflection-slider" thumbProps={{ "aria-label": "Угол падения", "aria-valuetext": `${angle}°` }} />
    </div>
  </div>;
}

const figures = {
  route: Route,
  meeting: Meeting,
  "right-triangle": RightTriangle,
  "projection-axis": ProjectionAxis,
  "lift-braking": LiftBraking,
  "elevator-scale": ElevatorScale,
  "gravity-distance": GravityDistance,
  "unit-cube": UnitCube,
  "signed-area": SignedArea,
  "reversal-area": ReversalArea,
  "stop-timeline": StopTimeline,
  "position-slope": PositionSlope,
  "catch-up": CatchUp,
  "travel-times": TravelTimes,
  "trial-readings": TrialReadings,
  "platform-departure": PlatformDeparture,
  "train-distance": TrainDistance,
  projectile: DropComparison,
  "train-frames": TrainFrameScene,
  "bicycle-gap": BicycleGapScene,
  "toss-height": TossHeight,
  "horizontal-throw": HorizontalThrow,
  cycle: HarmonicTrack,
  tangent: Tangent,
  lever: Lever,
  "wave-pulse": WavePulse,
  "heat-engine": HeatEngine,
  "gas-energy-budget": GasEnergyBudget,
  "thermal-cycle": ThermalCycle,
  "rail-joint": RailJoint,
  "expansion-plate": ExpansionPlate,
  depth: Depth,
  vessels: Vessels,
  "hydraulic-lift": HydraulicLift,
  "pool-pressure": PoolPressure,
  "brake-work": BrakeWork,
  "oscillation-budget": OscillationBudget,
  "floating-block": FloatingBlock,
  "balance-edge": BalanceEdge,
  "static-friction": StaticFriction,
  "crate-forces": CrateForces,
  "spring-marks": SpringMarks,
  "third-law": ThirdLaw,
  "standing-string": StandingString,
  "crest-intervals": CrestIntervals,
  collisions: CollisionBench,
  accommodation: AccommodationScene,
  "impact-pulse": ImpactPulse,
  flux: Flux,
  "magnet-coil": MagnetCoil,
  melting: Melting,
  "dew-point": DewPoint,
  "cooling-jar": CoolingJar,
  "condensate-mass": CondensateMass,
  "ice-remaining": IceRemaining,
  "gas-work": GasWork,
  "gas-work-ramp": GasWorkRamp,
  "isochoric-heating": IsochoricHeating,
  "heating-stages": HeatingStages,
  "gas-coordinates": GasCoordinates,
  "mixed-circuit": MixedCircuit,
  echo: Echo,
  "gas-piston": GasPiston,
  "wall-collision": WallCollision,
  "wall-pressure-trial": WallPressureTrial,
  "reaction-ledger": ReactionLedger,
  "point-field": PointField,
  "probe-charge": ProbeCharge,
  "field-addition": FieldAddition,
  "orbit-comparison": OrbitComparison,
  "power-lifts": PowerLifts,
  "vapor-balance": VaporBalance,
  "process-boundary": ProcessBoundary,
  "refraction-fronts": RefractionFronts,
  "potential-routes": PotentialRoutes,
  "suspended-charge": SuspendedCharge,
  "polarized-paper": PolarizedPaper,
  potential: Potential,
  "equipotential-move": EquipotentialMove,
  "plate-gap": PlateGap,
  "ohm-lines": OhmLines,
  "ohm-slope": OhmSlope,
  "branch-break": BranchBreak,
  "coulomb-forces": CoulombForces,
  "charge-through-section": ChargeThroughSection,
  "copper-wires": CopperWires,
  branch: Branch,
  meters: Meters,
  "source-circuit": SourceCircuit,
  "battery-under-load": BatteryUnderLoad,
  "terminal-voltage": TerminalVoltage,
  "power-bars": PowerBars,
  "heating-comparison": HeatingComparison,
  "dielectric-energy": DielectricEnergy,
  "work-signs": WorkSigns,
  "incline-choice": InclineChoice,
  "braking-distances": BrakingDistances,
  "load-power": LoadPower,
  ampere: Ampere,
  "wire-projection": WireProjection,
  lorentz: Lorentz,
  "spiral-in-field": SpiralInField,
  "moving-loop": MovingLoop,
  inductor: Inductor,
  "inductor-trace": InductorTrace,
  "induced-slope": InducedSlope,
  "lc-energies": LcEnergies,
  "contour-moments": ContourMoments,
  "equal-heating": EqualHeating,
  "wave-fields": WaveFields,
  "wave-crossing": WaveCrossing,
  spectrum: Spectrum,
  refraction: Refraction,
  "spherical-mirror": SphericalMirror,
  "mirror-concave": () => <MirrorPlate focal={15} distance={40} imageState={lensState(15,40)} />,
  "mirror-step": MirrorStep,
  "shadow-edges": ShadowEdges,
  "lens-rays": LensRays,
  "lens-screen": () => <LensConstruction solved />,
  "eye-focus": EyeFocus,
  "interference-phase": InterferencePhase,
  "grating-orders": GratingOrders,
  "slit-width": SlitWidth,
  "light-clock": LightClock,
  "photon-count": PhotonCount,
  "photon-momentum": PhotonMomentum,
  "photo-threshold": PhotoThreshold,
  "photo-current": PhotoCurrent,
  "stopping-energy": StoppingEnergy,
  "atom-levels": AtomLevels,
  "gold-foil": GoldFoil,
  "hydrogen-isotopes": HydrogenIsotopes,
  binding: Binding,
  "mass-difference": MassDifference,
  "nuclear-balance": NuclearBalance,
  "decay-products": DecayProducts,
  "half-life": HalfLife,
  "half-life-steps": HalfLifeSteps,
  reflection: Reflection,
};

export function LessonFigure({ figure }) {
  const Drawing = figures[figure?.kind];
  if (!Drawing) return null;
  return <figure className="lesson-figure" data-figure={figure.kind}>
    <Drawing figure={figure} />
    {figure.caption && <figcaption>{figure.kind === "mirror-concave" && <h3>Ход лучей</h3>}<Rich text={figure.caption} /></figcaption>}
  </figure>;
}
