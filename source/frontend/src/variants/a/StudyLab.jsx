import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Rich } from "@/components/shared/Tex";
import { T as MOTION_DURATION, useClock } from "@/components/shared/MotionModel";
import { trackUnique } from "@/lib/game";
import { gasState, circuitState, lensState, motionState, motionTrack, waveState } from "@/lib/studyModels";

const n = (v, digits = 1) => Number(v.toFixed(digits)).toLocaleString("ru");
function Control({ label, value, unit, min, max, step = 1, onChange, onCommit }) {
  const id = useId();
  return <div className="lab-control">
    <label id={id}>{label}<output>{n(value,2)} {unit}</output></label>
    <Slider thumbProps={{"aria-labelledby":id,"aria-valuetext":n(value,2)+" "+unit}} value={[value]} min={min} max={max} step={step}
      onValueChange={([next]) => onChange(next)} onValueCommit={onCommit} />
  </div>;
}
function Readout({ title, value, unit }) { return <div><dt>{title}</dt><dd>{value}<span>{unit}</span></dd></div>; }
function PlotAxes({ xlabel, ylabel }) {
  return <><path className="lab-axis" d="M60 25V250H610" /><text x="75" y="24">{ylabel}</text><text x="570" y="286">{xlabel}</text></>;
}
function Gas({ changed }) {
  const [T,setT] = useState(300), [V,setV] = useState(10);
  const pressure = gasState(T,V).pressureKpa;
  const clip = useId().replaceAll(":","");
  const line = useMemo(() => Array.from({length:120},(_,i) => {
    const v = 1 + i * 29 / 119;
    const ordinate = 250 - gasState(T,v).pressureKpa / 900 * 220;
    return `${i ? "L" : "M"}${(60 + v * 18).toFixed(2)},${ordinate.toFixed(2)}`;
  }).join(" "), [T]);
  return <><div className="lab-visual lab-gas"><svg viewBox="0 0 640 300" role="img" aria-label={"Изотерма при " + T + " К; объём " + V + " л, давление " + n(pressure) + " кПа."}>
    <defs><clipPath id={clip}><path d="M60 25H610V250H60Z" /></clipPath></defs><PlotAxes xlabel="V, л" ylabel="p, кПа" />
    {[10,20,30].map(v => <g key={v}><path className="lab-grid" d={"M"+(60+v*18)+" 25V250"} /><text x={60+v*18} y="273" textAnchor="middle">{v}</text></g>)}
    {[300,600,900].map(p => <g key={p}><path className="lab-grid" d={"M60 "+(250-p/900*220)+"H610"} /><text x="49" y={255-p/900*220} textAnchor="end">{p}</text></g>)}
    <path className="lab-curve" d={line} clipPath={"url(#"+clip+")"} /><circle className="lab-point" cx={60+V*18} cy={250-pressure/900*220} r="7" /></svg></div>
    <div className="lab-controls">
      <Control label="Объём" value={V} unit="л" min={5} max={30} onChange={setV} onCommit={changed} />
      <Control label="Температура" value={T} unit="К" min={200} max={500} step={10} onChange={setT} onCommit={changed} />
    </div>
    <dl className="lab-readouts"><Readout title="Давление" value={n(pressure)} unit="кПа" /><Readout title="Количество газа" value="1" unit="моль" /></dl>
    <p className="lab-caption">Кривая построена при выбранной температуре. Сначала меняй только объём, затем сравни другую изотерму. Газ идеальный, R = 8,31 Дж/(моль·К).</p></>;
}
function Circuit({ changed }) {
  const [mode,setMode] = useState("series"), [U,setU] = useState(12), [r1,setR1] = useState(4), [r2,setR2] = useState(8);
  const parallel = mode === "parallel", s = circuitState(U,r1,r2,parallel);
  const resistor = (x,y,label) => <g><rect className="lab-resistor" x={x-25} y={y-20} width="160" height="40" rx="5" /><text x={x+55} y={y+8} textAnchor="middle">{label}</text></g>;
  return <><ToggleGroup type="single" className="lab-modes" value={mode} onValueChange={v => {if(v){setMode(v);changed();}}} aria-label="Соединение резисторов"><ToggleGroupItem value="series">Последовательно</ToggleGroupItem><ToggleGroupItem value="parallel">Параллельно</ToggleGroupItem></ToggleGroup>
    <div className="lab-visual"><svg viewBox="0 0 640 300" role="img" aria-label={parallel ? "Два резистора параллельно идеальному источнику" : "Два последовательно соединённых резистора и идеальный источник"}>
      <path className="lab-battery" d="M57 135H103M66 165H94" /><text x="29" y="151">+</text><text x="22" y="192">{U} В</text>
      {parallel ? <>
        <path className="lab-wire" d="M80 135V100H152V52H234 M394 52H484V152H394 M234 152H152V100 M484 100H550V230H80V165" />
        <circle cx="152" cy="100" r="5" className="lab-node" /><circle cx="484" cy="100" r="5" className="lab-node" />
        {resistor(259,52,"R₁ = "+r1+" Ом")}{resistor(259,152,"R₂ = "+r2+" Ом")}
      </> : <>
        <path className="lab-wire" d="M80 135V75H165 M325 75H355 M515 75H550V230H80V165" />
        {resistor(190,75,"R₁ = "+r1+" Ом")}{resistor(380,75,"R₂ = "+r2+" Ом")}
      </>}
      <text x="315" y="270" textAnchor="middle">Идеальный источник</text>
    </svg></div><div className="lab-controls">
      <Control label="Напряжение" value={U} unit="В" min={2} max={24} onChange={setU} onCommit={changed} />
      <Control label="R₁" value={r1} unit="Ом" min={2} max={20} onChange={setR1} onCommit={changed} />
      <Control label="R₂" value={r2} unit="Ом" min={2} max={20} onChange={setR2} onCommit={changed} />
    </div>
    <dl className="lab-readouts"><Readout title="Общее сопротивление" value={n(s.resistance,2)} unit="Ом" /><Readout title="Ток источника" value={n(s.current,2)} unit="А" /><Readout title="Токи I₁ / I₂" value={n(s.i1,2)+" / "+n(s.i2,2)} unit="А" /><Readout title="Напряжения U₁ / U₂" value={n(s.u1,2)+" / "+n(s.u2,2)} unit="В" /></dl></>;
}
function Lens({ changed }) {
  const [mode,setMode] = useState("converging"), [f,setF] = useState(20), [a,setA] = useState(40);
  const focal = mode === "converging" ? f : -f, s = lensState(focal,a);
  const scale=2.8, cx=330, cy=150, h=42, right=105;
  const imageVisible = s.b !== null && Math.abs(s.b) <= 100 && Math.abs(s.magnification)*h < 120;
  return <><ToggleGroup type="single" className="lab-modes" value={mode} onValueChange={v=>{if(v){setMode(v);changed();}}} aria-label="Вид линзы"><ToggleGroupItem value="converging">Собирающая</ToggleGroupItem><ToggleGroupItem value="diverging">Рассеивающая</ToggleGroupItem></ToggleGroup>
    <div className="lab-visual"><svg viewBox="0 0 640 300" role="img" aria-label={s.atFocus ? "Предмет в фокусе: после линзы лучи параллельны" : "Ход двух лучей в тонкой линзе; " + (s.b > 0 ? "действительное" : "мнимое") + " изображение"}>
      <path className="lab-axis" d="M25 150H620" /><path className="lab-lens" d={focal>0 ? "M330 45Q294 150 330 255Q366 150 330 45Z" : "M315 45Q341 150 315 255H345Q319 150 345 45Z"} />
      {[-1,1].map(sign=><g key={sign}><circle cx={cx+sign*f*scale} cy={cy} r="4" className="lab-focus" /><text x={cx+sign*f*scale} y="175" textAnchor="middle">F</text></g>)}
      <path className="lab-object" d={"M"+(cx-a*scale)+" 150v-"+h+"m-7 8l7-8 7 8"} />
      <path className="lab-ray" d={"M"+(cx-a*scale)+","+(cy-h)+"H"+cx+"L"+(cx+right*scale)+","+(cy-h+h*right/focal)} />
      <path className="lab-ray second" d={"M"+(cx-a*scale)+","+(cy-h)+"L"+(cx+right*scale)+","+(cy+h*right/a)} />
      {s.b<0 && <><path className="lab-ray virtual" d={"M"+cx+","+(cy-h)+"L"+(cx+s.b*scale)+","+(cy+h*s.b/a)} /><path className="lab-ray second virtual" d={"M"+cx+","+cy+"L"+(cx+s.b*scale)+","+(cy+h*s.b/a)} /></>}
      {imageVisible && <path className="lab-image" strokeDasharray={s.b<0?"5 4":undefined} d={"M"+(cx+s.b*scale)+" 150v"+(h*s.b/a)+"m-7 "+(s.b>0?-8:8)+"l7 "+(s.b>0?8:-8)+" 7 "+(s.b>0?-8:8)} />}
    </svg></div><ul className="lab-legend" aria-label="Обозначения на рисунке"><li><i className="lab-object-key" />Предмет</li><li><i className="lab-image-key" />Изображение</li><li>F — фокус</li></ul>
    <div className="lab-controls">
      <Control label="Модуль фокусного расстояния" value={f} unit="см" min={10} max={30} onChange={setF} onCommit={changed} />
      <Control label="От предмета до линзы" value={a} unit="см" min={5} max={90} onChange={setA} onCommit={changed} />
    </div>
    <dl className="lab-readouts"><Readout title="Расстояние до изображения b" value={s.atFocus ? "∞" : n(s.b,1)} unit={s.atFocus ? "" : "см"} /><Readout title="Увеличение Γ" value={s.atFocus ? "—" : n(s.magnification,2)} unit="" /></dl>
    <p className="lab-caption">{s.atFocus ? "Предмет в фокальной плоскости: лучи после линзы параллельны, конечного изображения нет." : s.b < 0 ? "Мнимое изображение находится со стороны предмета. Пунктиром показаны продолжения лучей." : "Действительное изображение находится за линзой. Отрицательное увеличение означает переворот."}{!imageVisible && !s.atFocus ? " Изображение выходит за границы рисунка; расстояние указано выше." : ""}</p></>;
}
function Wave({ changed }) {
  const reduce = useReducedMotion();
  const [speed,setSpeed] = useState(20), [frequency,setFrequency] = useState(1), [amplitude,setAmplitude] = useState(.4);
  const [running, setRunning] = useState(false);
  const time = useRef(0);
  const wave = useRef(null), point = useRef(null);
  const clip = useId();
  const s = waveState(speed, frequency);
  const periodWidth = s.wavelength * 14;
  const line = useMemo(() => {
    // Include a full period to the left so translation never reveals an edge.
    const span = 560 + periodWidth;
    const steps = Math.ceil(24 * span / periodWidth);
    return Array.from({ length: steps + 1 }, (_, index) => {
      const x = index / steps * span - periodWidth;
      const y = 150 - amplitude * 110 * Math.sin(2 * Math.PI * x / periodWidth);
      return `${index ? "L" : "M"}${(50 + x).toFixed(2)},${y.toFixed(2)}`;
    }).join(" ");
  }, [amplitude, periodWidth]);

  const paint = useCallback(() => {
    const curve = wave.current, marker = point.current;
    if (!curve || !marker) return;
    const phase = time.current * frequency % 1;
    curve.setAttribute("transform", `translate(${phase * periodWidth} 0)`);
    marker.setAttribute("cy", 150 - amplitude * 110 * Math.sin(2 * Math.PI * (140 / periodWidth - phase)));
  }, [amplitude, frequency, periodWidth]);
  useLayoutEffect(() => { paint(); }, [paint]);
  useEffect(() => {
    if (!running || reduce) return undefined;
    let frame, previous;
    const tick = now => {
      time.current += Math.min((now - (previous ?? now)) / 1000, .05);
      previous = now;
      paint();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, reduce, paint]);

  return <><div className="lab-visual"><svg viewBox="0 0 640 275" role="img"
    aria-label={"Поперечная волна. Длина " + n(s.wavelength) + " м. Отмеченная точка движется вверх и вниз."}>
    <defs><clipPath id={clip}><rect x="50" y="54" width="560" height="187" /></clipPath></defs>
    <path className="lab-axis" d="M50 150H610" />
    <path className="lab-medium-track" d="M190 65V235" />
    <g clipPath={`url(#${clip})`}><path ref={wave} className="lab-curve" d={line} /></g>
    <circle ref={point} className="lab-point" cx="190" r="7" />
    {[0,20,40].map(x => <text key={x} x={50+x*14} y="258" textAnchor={x===40 ? "end" : "middle"}>{x}{x===40 && " м"}</text>)}
    <text x="190" y="41" textAnchor="middle">Точка среды</text>
    <path className="lab-direction" d="M470 48h75m-10-6 10 6-10 6" /><text x="470" y="30">Волна</text>
    </svg></div>
    <div className="lab-playback">
      <Button variant="secondary" disabled={Boolean(reduce)} onClick={() => setRunning(value => !value)}>
        {running && !reduce ? <Pause /> : <Play />}{running && !reduce ? "Пауза" : "Запустить"}
      </Button>
      <Button variant="ghost" onClick={() => { time.current = 0; paint(); }}><RotateCcw />В начало</Button>
      {reduce && <span>Движение уменьшено в настройках устройства.</span>}
    </div>
    <div className="lab-controls">
      <Control label="Скорость волны" value={speed} unit="м/с" min={10} max={50} step={5} onChange={setSpeed} onCommit={changed} />
      <Control label="Частота" value={frequency} unit="Гц" min={.5} max={5} step={.5} onChange={setFrequency} onCommit={changed} />
      <Control label="Амплитуда" value={amplitude} unit="м" min={.1} max={.7} step={.1} onChange={setAmplitude} onCommit={changed} />
    </div>
    <dl className="lab-readouts"><Readout title="Длина волны λ" value={n(s.wavelength,2)} unit="м" /><Readout title="Период T" value={n(s.period,2)} unit="с" /></dl><p className="lab-caption">Профиль идёт вправо, выделенная точка остаётся на своём месте по горизонтали. Масштаб вертикальных отклонений увеличен.</p></>;
}
function motionMarkers(v0, a, project) {
  const byPosition = new Map();
  for (let second = 0; second <= MOTION_DURATION; second++) {
    const { x } = motionState(v0, a, second);
    if (!byPosition.has(x)) byPosition.set(x, []);
    byPosition.get(x).push(second);
  }

  const rowEnds = [];
  return [...byPosition.entries()].sort(([left], [right]) => left - right).map(([position, seconds]) => {
    const x = project(position);
    const label = seconds.length === MOTION_DURATION + 1 ? `0–${MOTION_DURATION}` : seconds.join(", ");
    // Reserve space for the digits at the larger mobile text size.
    const halfWidth = label.length * 10 + 4;
    const freeRow = rowEnds.findIndex(end => end <= x - halfWidth);
    const row = freeRow === -1 ? rowEnds.length : freeRow;
    rowEnds[row] = x + halfWidth;
    const minor = seconds.every(second => second > 3 && second < MOTION_DURATION && second !== 5);
    return { x, label, row, minor };
  });
}

function Motion({ changed }) {
  const reduce = useReducedMotion();
  const [v0, setV0] = useState(0);
  const [a, setA] = useState(2);
  const point = useRef(null), arrow = useRef(null), drawFrame = useRef(null);
  const {t, timeRef, playing, setPlaying, seek} = useClock([], {
    loop:false, resetOnChange:false, autoPlay:false, drawFrame, rate:2,
  });
  useEffect(() => { if (reduce && playing) setPlaying(false); }, [reduce, playing, setPlaying]);

  const { project, markers, distances } = useMemo(() => {
    const track = motionTrack(v0, a, MOTION_DURATION);
    const max = Math.max(10, track.max);
    const project = x => 60 + (x - track.min) / (max - track.min) * 520;
    return {
      project,
      markers: motionMarkers(v0, a, project),
      distances: [1, 2, 3].map(second => n(track.distance(second - 1, second), 2)).join(" / "),
    };
  }, [v0, a]);
  const { v, x } = motionState(v0, a, t);
  const velocity = n(v, 2);
  const vmax = Math.max(1, Math.abs(v0), Math.abs(motionState(v0, a, MOTION_DURATION).v));
  useLayoutEffect(() => {
    const draw = time => {
      const state = motionState(v0, a, time);
      const pointX = project(state.x);
      const direction = Math.sign(state.v);
      point.current.setAttribute("cx", pointX);
      arrow.current.setAttribute("visibility", direction ? "visible" : "hidden");
      if (!direction) return;
      const tip = Math.max(20, Math.min(620, pointX + direction * Math.max(12, Math.abs(state.v) / vmax * 160)));
      arrow.current.setAttribute("d", `M${pointX} 72H${tip}m${-direction * 10} -6l${direction * 10} 6 ${-direction * 10} 6`);
    };
    drawFrame.current = draw;
    draw(timeRef.current);
    return () => { drawFrame.current = null; };
  }, [v0, a, project, timeRef, vmax]);

  return <>
    <div className="lab-visual"><svg viewBox="0 0 640 300" role="img" aria-label={"Движение: начальная скорость " + v0 + " м/с, ускорение " + a + " м/с². В момент " + n(t,1) + " с координата " + n(x,1) + " м, скорость " + velocity + " м/с."}>
      <path className="lab-axis" d="M40 240H610" /><text x="602" y="276" textAnchor="end">x, м</text>
      {markers.map(({ x, row, minor }) => <g key={x}>
        {row > 0 && !minor && <path className="lab-motion-guide" d={`M${x} ${232 - row * 33}V235`} />}
        <circle cx={x} cy="240" r="4" className="lab-tick" />
      </g>)}
      {markers.filter(mark => !mark.minor).map(({ x, label, row }) => <text key={x} className="lab-motion-label"
        x={x} y={222 - row * 33} textAnchor="middle">{label}</text>)}
      <circle ref={point} className="lab-point" cy="240" r="9" />
      <path ref={arrow} className="lab-direction" />
    </svg></div>
    <div className="lab-playback">
      <Button variant="secondary" disabled={Boolean(reduce)} onClick={() => setPlaying(value => !value)}>
        {playing ? <Pause /> : <Play />}{playing ? "Пауза" : t === MOTION_DURATION ? "Запустить заново" : "Запустить"}
      </Button>
      <Button variant="ghost" onClick={() => seek(0)}><RotateCcw />В начало</Button>
      {reduce && <span>Движение уменьшено в настройках устройства.</span>}
    </div>
    <div className="lab-controls">
      <Control label="Начальная скорость" value={v0} unit="м/с" min={0} max={20} onChange={setV0} onCommit={changed} />
      <Control label="Ускорение" value={a} unit="м/с²" min={-4} max={4} step={0.5} onChange={setA} onCommit={changed} />
      <Control label="Время" value={t} unit="с" min={0} max={MOTION_DURATION} step={0.1} onChange={seek} onCommit={changed} />
    </div>
    <dl className="lab-readouts">
      <Readout title="Координата x(t)" value={n(x,1)} unit="м" />
      <Readout title="Скорость υ(t)" value={velocity} unit="м/с" />
      <Readout title="Путь за 1-ю / 2-ю / 3-ю с" value={distances} unit="м" />
    </dl>
    <p className="lab-caption">Отметки показывают положение тела каждую секунду. Сравни путь за первые три секунды. При старте с места и ненулевом ускорении эти пути относятся как 1 : 3 : 5.</p>
  </>;
}
export function StudyLab({ block, lesson }) {
  const Lab = {gas:Gas,circuit:Circuit,lens:Lens,wave:Wave,motion:Motion}[block.lab];
  const [prompt, ...followUp] = block.paragraphs ?? [];
  return <>
    <h2 id="lesson-step-title" className="lesson-step-title">{block.title}</h2>
    {prompt && <p className="lesson-paragraph lesson-lead"><Rich text={prompt} /></p>}
    <section className={"study-lab lab-"+block.lab} aria-label={block.title}>
      {Lab && <Lab changed={()=>trackUnique("model",lesson.slug+":"+block.id)} />}
      {followUp.length > 0 && <aside className="lab-follow-up">
        {followUp.map(p => <p key={p}><Rich text={p} /></p>)}
      </aside>}
    </section>
  </>;
}
