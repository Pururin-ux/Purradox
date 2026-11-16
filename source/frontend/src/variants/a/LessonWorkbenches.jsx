import { useCallback, useId, useMemo, useRef, useState } from "react";
import { Focus, MoveUpLeft, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { collisionState, rlStep } from "@/lib/studyModels";
import { LessonArtwork, LessonProp } from "./LessonArt";
import { useLessonTrial } from "./useLessonTrial";

const decimal = (value, digits) => value.toFixed(digits).replace(".", ",");
const impactAt = 0.5;
const trackDuration = 2.1;
const cartWidth = 112;
const firstCartStart = 100;
const trackScale = 55;
const initialSpeed = 2;
const secondCartStart = firstCartStart + impactAt * initialSpeed * trackScale + cartWidth;
const afterImpact = time => time >= impactAt;

function RailCart({ elementRef, x, velocity, name }) {
  const arrowTip = 13 + velocity * 18;
  return <g ref={elementRef} transform={`translate(${x} 91)`}>
    <LessonProp name={name} x={-cartWidth / 2} y={-16} width={cartWidth} height={44} fit="none" />
    {velocity > 0 && <path d={`M-15-41H${arrowTip}m-8-6 8 6-8 6`} fill="none" stroke="#ffe1a9"
      strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />}
  </g>;
}

export function CollisionBench() {
  const title = useId();
  const railGradient = useId();
  const [mode, setMode] = useState("elastic");
  const redCart = useRef(null), purpleCart = useRef(null);
  const mass = 0.5;
  const { v1, v2, momentum, initialEnergy, finalEnergy } = collisionState(mass, mass, initialSpeed, 0, mode === "elastic" ? 1 : 0);
  const drawFrame = useCallback(time => {
    const travel = Math.max(0, time - impactAt) * trackScale;
    const left = firstCartStart + Math.min(time, impactAt) * initialSpeed * trackScale + v1 * travel;
    const right = secondCartStart + v2 * travel;
    redCart.current.setAttribute("transform", `translate(${left} 91)`);
    purpleCart.current.setAttribute("transform", `translate(${right} 91)`);
  }, [v1, v2]);
  const { time, playing, complete, launch, seek } = useLessonTrial(trackDuration, { drawFrame, readAt: afterImpact });

  function selectMode(value) {
    if (!value || value === mode) return;
    seek(0);
    setMode(value);
  }

  const after = afterImpact(time);
  const velocities = [after ? v1 : initialSpeed, after ? v2 : 0];
  const rows = [
    { label: "Импульс", before: momentum, after: momentum, unit: "кг·м/с" },
    { label: "Кинетическая энергия", before: initialEnergy, after: finalEnergy, unit: "Дж" },
  ];

  return <section className="impact-bench" aria-labelledby={title} data-nodrag>
    <header className="impact-head">
      <div><h3 id={title}>Два удара на одном рельсе</h3><p>Тележки по 0,50 кг. Трением пренебрегаем.</p></div>
      <ToggleGroup className="impact-options" type="single" value={mode} onValueChange={selectMode} aria-label="Вид столкновения">
        <ToggleGroupItem value="elastic">Упругий</ToggleGroupItem>
        <ToggleGroupItem value="sticky">Со сцепкой</ToggleGroupItem>
      </ToggleGroup>
    </header>
    <div className="impact-stage">
      <svg className="impact-rail" viewBox="0 0 520 136" role="img"
        aria-label={`Коралловая: ${velocities[0]} м/с. Фиолетовая: ${velocities[1]} м/с. Направление вправо.`}>
        <defs><linearGradient id={railGradient} x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#b298b6" /><stop offset="1" stopColor="#644c7d" />
        </linearGradient></defs>
        <path d="M16 118H500L519 131H0Z" fill={`url(#${railGradient})`} />
        <path d="M15 118h488M40 128h440" stroke="#fff1d3" strokeWidth="2" strokeLinecap="round" opacity=".65" />
        <path d="M32 88v29M486 88v29" stroke="#7c567c" strokeWidth="10" strokeLinecap="round" />
        <path d="M32 90v15M486 90v15" stroke="#d89f7c" strokeWidth="4" strokeLinecap="round" />
        <path d="M71 128v-5m58 5v-5m58 5v-5m58 5v-5m58 5v-5m58 5v-5m58 5v-5m58 5v-5" stroke="#725578" strokeWidth="2" opacity=".7" />
        <RailCart elementRef={redCart} x={firstCartStart} velocity={velocities[0]} name="red-cart" />
        <RailCart elementRef={purpleCart} x={secondCartStart} velocity={velocities[1]} name="purple-cart" />
      </svg>
      <div className="impact-velocities" aria-hidden="true">
        <span><i />Коралловая <b>{velocities[0]} м/с</b></span>
        <span><i />Фиолетовая <b>{velocities[1]} м/с</b></span>
      </div>
    </div>
    <div className="impact-run">
      <Button type="button" className="impact-launch" onClick={launch} aria-disabled={playing || undefined}>
        {complete ? <RotateCcw aria-hidden="true" /> : <Play aria-hidden="true" />}
        {playing ? "Опыт идёт" : complete ? "Ещё раз" : "Запустить"}
      </Button>
      <p>Сравни показания для двух ударов.</p>
    </div>
    <table className="impact-ledger" aria-label="Показания для обеих тележек вместе">
      <thead><tr><th scope="col">Общий итог</th><th scope="col">До удара</th><th scope="col">После</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.label}>
        <th scope="row">{row.label}</th>
        <td>{decimal(row.before, 2)} <span>{row.unit}</span></td>
        <td data-after={after || undefined}>{after ? <>{decimal(row.after, 2)} <span>{row.unit}</span></> : "—"}</td>
      </tr>)}</tbody>
    </table>
    <span className="sr-only" role="status">{after ? `После удара: ${decimal(momentum, 2)} килограмм-метра в секунду, ${decimal(finalEnergy, 2)} джоуля.` : ""}</span>
  </section>;
}

const U = 6, R = 3, tMax = 120, traceHeight = 58;
const plotSize = 360;
const traces = [0.6, 1.2].map(inductance => Array.from({ length: tMax + 1 }, (_, tick) => rlStep(U, R, inductance, tick / 100)));
const ticks = [0, 60, 120];
const plots = [
  { key: "current", title: "Ток", unit: "А", max: U / R },
  { key: "emfMagnitude", title: "Модуль ЭДС", unit: "В", max: U },
];
const traceX = tick => tick * plotSize / tMax;
const traceY = (value, max) => 5 + traceHeight * (1 - value / max);

function TraceLane({ name, unit, kind, max, samples, pick }) {
  const value = samples[pick][kind];
  const path = useMemo(() => samples.map((sample, i) =>
    `${i ? "L" : "M"}${traceX(i)} ${traceY(sample[kind], max).toFixed(2)}`).join(" "), [samples, kind, max]);
  return <div className="coil-lane" data-lane={kind}>
    <div className="coil-lane-label"><span><i aria-hidden="true" />{name}</span><b className="coil-reading">{decimal(value, 2)} {unit}</b></div>
    <div className="coil-plot-row" aria-hidden="true">
      <div className="coil-axis-range"><span>{max} {unit}</span><span>0</span></div>
      <div className="coil-plot">
        <svg viewBox={`0 0 ${plotSize} ${traceHeight + 10}`} preserveAspectRatio="none">
          <path d={ticks.map(tick => `M${traceX(tick)} 5V${traceHeight + 5}`).join(" ")} className="coil-gridline" />
          <path d={[0, 0.5, 1].map(fraction => `M0 ${traceY(fraction * max, max)}H${plotSize}`).join(" ")} className="coil-gridline" />
          <path d={path} className="coil-curve" />
          <path d={`M${traceX(pick)} 2V${traceHeight + 8}`} className="coil-cursor" />
        </svg>
        <i className="coil-dot" style={{left:`${pick / tMax * 100}%`,top:`${traceY(value, max) / (traceHeight + 10) * 100}%`}} />
      </div>
    </div>
  </div>;
}

export function InductorTrace() {
  const title = useId(), timeLabel = useId();
  const [coil, setCoil] = useState("0.6");
  const [tick, setTick] = useState(20);
  const samples = traces[coil === "0.6" ? 0 : 1];
  const sample = samples[tick];
  const time = decimal(tick / 100, 2);
  return <section className="coil-bench" aria-labelledby={title} data-nodrag>
    <header className="coil-header">
      <div><h3 id={title}>После замыкания</h3><p>Источник 6 В · сопротивление 3 Ом</p></div>
      <img src="/art/lesson-plates/coil.webp" className="coil-prop" width="91" height="46" alt="" />
    </header>
    <div className="coil-screen">
      {plots.map(plot => <TraceLane key={plot.key} name={plot.title} unit={plot.unit} kind={plot.key}
        max={plot.max} samples={samples} pick={tick} />)}
      <div className="coil-time-scale" aria-hidden="true"><span>0</span><span>0,6</span><span>1,2 с</span></div>
    </div>
    <div className="coil-control">
      <div>
        <div className="coil-time-label"><span id={timeLabel}>С момента замыкания</span><b>{time} с</b></div>
        <Slider className="coil-slider" min={0} max={tMax} step={1} value={[tick]} onValueChange={([value]) => setTick(value)}
          thumbProps={{"aria-labelledby":timeLabel,"aria-valuetext":`${time} с, ток ${decimal(sample.current, 2)} А, модуль ЭДС ${decimal(sample.emfMagnitude, 2)} В`}} />
      </div>
      <ToggleGroup type="single" className="coil-options" value={coil} onValueChange={value => { if (value) setCoil(value); }} aria-label="Индуктивность катушки">
        <ToggleGroupItem value="0.6">0,6 Гн</ToggleGroupItem>
        <ToggleGroupItem value="1.2">1,2 Гн</ToggleGroupItem>
      </ToggleGroup>
    </div>
    <p className="coil-instruction">Оставь время прежним и поменяй катушку. С какой ток растёт медленнее?</p>
  </section>;
}

export function AccommodationScene({ figure }) {
  const [lookFar, setLookFar] = useState(false);
  const pictureSizes = "(max-width: 740px) calc(100vw - 76px), 675px";
  return <div className="focus-bench" data-far={lookFar} data-nodrag>
    <div className="focus-picture">
      <LessonArtwork art={figure.near} sizes={pictureSizes} decorative={lookFar} />
      <LessonArtwork art={figure.far} className="focus-far" sizes={pictureSizes} decorative={!lookFar} />
    </div>
    <div className="focus-footer">
      <div className="focus-observation" role="status">
        <b>{lookFar ? "Взгляд вдаль" : "Взгляд вблизи"}</b>
        <span>{lookFar ? "Огонёк отчётливый, края треугольника расплылись." : "Треугольник резкий, огонёк за окном расплывается."}</span>
      </div>
      <Button type="button" className="focus-action" onClick={() => setLookFar(previous => !previous)}>
        {lookFar ? <Focus aria-hidden="true" /> : <MoveUpLeft aria-hidden="true" />}
        {lookFar ? "Взглянуть на карточку" : "Посмотреть в окно"}
      </Button>
    </div>
  </div>;
}
