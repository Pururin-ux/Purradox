import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, MoveHorizontal, Play, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tex } from "@/components/shared/Tex";
import { gasWallTrial, harmonicState } from "@/lib/studyModels";
import { updateTrialReading, useLessonTrial } from "./useLessonTrial";

const amplitude = 12;
const period = 2;
const verticalFraction = x => 50 - 40 * x / amplitude;
const markedMoments = ["0", "T/4", "T/2", "3T/4", "T"];

function formattedSigned(value) {
  const rounded = Number(value.toFixed(1));
  if (rounded === 0) return "0";
  const magnitude = Math.abs(rounded).toLocaleString("ru");
  return (rounded < 0 ? "−" : "+") + magnitude;
}

function PositionCurve({ position, sample }) {
  const canvas = useRef(null);
  useEffect(() => {
    const node = canvas.current;
    const ctx = node?.getContext?.("2d");
    if (!ctx) return;
    const { width, height } = node;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#86669b";
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let tick = 0; tick <= 100; tick += 1) {
      const state = harmonicState(amplitude, period, tick * period / 100);
      const x = tick * width / 100;
      const y = verticalFraction(state.x) * height / 100;
      if (tick === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, []);

  return <div className="harmonic-curve" aria-hidden="true">
    <span className="harmonic-axis-name">Смещение</span>
    <div className="harmonic-plot">
      <div className="harmonic-ticks"><span>+A</span><span>0</span><span>−A</span></div>
      <div className="harmonic-paper" style={{ "--phase-x": sample + "%", "--phase-y": verticalFraction(position) + "%" }}>
        <canvas ref={canvas} width="744" height="216" />
        <span className="harmonic-cursor" />
        <span className="harmonic-marker" />
      </div>
      <div className="harmonic-time-ticks"><span>0</span><span>T/2</span><span>T</span></div>
    </div>
  </div>;
}

export function HarmonicTrack() {
  const [sample, setSample] = useState(0);
  const title = useId(), scrubLabel = useId();
  const time = sample * period / 100;
  const { x, v } = harmonicState(amplitude, period, time);
  const direction = Math.abs(v) < 0.05 ? "покой" : v > 0 ? "вправо" : "влево";
  const timeLabel = time.toLocaleString("ru", { maximumFractionDigits: 2 }) + " с";
  const position = formattedSigned(x);
  const speed = formattedSigned(v);

  return <section className="harmonic-study" data-nodrag aria-labelledby={title}>
    <h3 id={title}>Грузик на пружине</h3>
    <p className="harmonic-setup">Амплитуда 12 см · период 2 с</p>
    <div className="harmonic-assembly">
      <div className="harmonic-track" aria-hidden="true" style={{ "--car": (58 + 19 * x / amplitude) + "%" }}>
        <span className="harmonic-base" /><span className="harmonic-post" />
        <span className="harmonic-spring">
          {Array.from({ length: 12 }, (_, i) => <i key={i} />)}
        </span>
        <span className="harmonic-weight">
          <img src="/art/lesson-hooks/pruzhinnyj-gruz-v1.webp" width="544" height="181" alt="" draggable="false" />
        </span>
        {direction !== "покой" && <span className="harmonic-arrow" data-left={v < 0 || undefined}
          style={{ width: (13 + Math.abs(v) * 0.58) + "px" }} />}
        <div className="harmonic-track-ticks"><span>−A</span><span>0</span><span>+A</span></div>
      </div>
      <PositionCurve position={x} sample={sample} />
    </div>
    <div className="harmonic-readings">
      <div><span>Смещение</span><b>{position} см</b></div>
      <div><span>Скорость</span><b>{speed} см/с</b><span>· {direction}</span></div>
    </div>
    <div className="harmonic-time"><span id={scrubLabel}><MoveHorizontal aria-hidden="true" /> Ход колебания</span><b>{timeLabel}</b></div>
    <Slider className="harmonic-slider" value={[sample]} min={0} max={100} step={1} onValueChange={([value]) => setSample(value)}
      thumbProps={{ "aria-labelledby": scrubLabel, "aria-valuetext": `${timeLabel}, смещение ${position} см, скорость ${speed} см/с, ${direction}` }} />
    <ToggleGroup type="single" className="harmonic-moments" aria-label="Отметки на графике" value={String(sample)} onValueChange={value => {
      if (value !== "") setSample(Number(value));
    }}>
      {markedMoments.map((moment, i) => <ToggleGroupItem key={moment} value={String(25 * i)}>{moment}</ToggleGroupItem>)}
    </ToggleGroup>
    <p className="harmonic-note">Найди два момента, когда грузик проходит через ноль. Куда он движется в каждом?</p>
  </section>;
}

const wallDuration = 2;
const startingParticles = gasWallTrial(0, 1).particles;
const wallClock = new Intl.NumberFormat("ru", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format;

export function WallPressureTrial() {
  const title = useId();
  const [speed, setSpeed] = useState(1);
  const [samples, setSamples] = useState({});
  const lanes = useRef(null), timeReading = useRef(null), hitReading = useRef(null);
  const drawFrame = useCallback(time => {
    const { particles, hits } = gasWallTrial(time, speed);
    particles.forEach(({ position, onWall }, index) => {
      const lane = lanes.current.children[index];
      lane.toggleAttribute("data-contact", onWall);
      lane.firstElementChild.style.left = position * 100 + "%";
    });
    updateTrialReading(timeReading.current, wallClock(time) + " с");
    updateTrialReading(hitReading.current, String(hits));
  }, [speed]);
  const { playing, complete, launch, seek } = useLessonTrial(wallDuration, { drawFrame });
  const { hits, transfer } = gasWallTrial(wallDuration, speed);
  const first = samples[1], second = samples[2];

  useEffect(() => {
    if (!complete) return;
    setSamples(previous => ({ ...previous, [speed]: { hits, transfer } }));
  }, [complete, hits, speed, transfer]);

  return <section className="wall-study" aria-labelledby={title} data-nodrag>
    <header className="wall-header">
      <div><h3 id={title}>Две секунды у стенки</h3><p>Шесть молекул, одинаковые стартовые позиции.</p></div>
      <ToggleGroup className="wall-speed" type="single" value={String(speed)} aria-label="Скорость молекул" onValueChange={value => {
        if (!value || speed === Number(value)) return;
        seek(0);
        setSpeed(Number(value));
      }}>
        <ToggleGroupItem value="1">Исходная</ToggleGroupItem>
        <ToggleGroupItem value="2">Вдвое выше</ToggleGroupItem>
      </ToggleGroup>
    </header>
    <div className="wall-chamber" aria-hidden="true">
      <div className="wall-tag">Счёт у этой стенки <span>→</span></div>
      <div ref={lanes} className="wall-lanes">
        {startingParticles.map(({ position }, i) => <div key={i} className="wall-lane">
          <i className="wall-particle" style={{ left: (position * 100) + "%" }} />
        </div>)}
      </div>
      <div className="wall-live"><span ref={timeReading}>0,0 с</span>
        <span>Ударов: <b ref={hitReading}>0</b></span></div>
    </div>
    <Button type="button" className="wall-launch" onClick={launch} aria-disabled={playing || undefined}>
      {complete ? <RotateCcw aria-hidden="true" /> : <Play aria-hidden="true" />}
      {playing ? "Идёт замер" : complete ? "Повторить замер" : "Начать замер"}
    </Button>
    <table className="wall-measures" aria-label="Показания двух замеров">
      <thead><tr><th scope="col">За 2 с</th><th scope="col">v₀</th><th scope="col">2v₀</th></tr></thead>
      <tbody>
        <tr><th scope="row">Число ударов</th><td>{samples[1]?.hits ?? "—"}</td><td>{samples[2]?.hits ?? "—"}</td></tr>
        <tr><th scope="row">Импульс стенке, усл. ед.</th><td>{samples[1]?.transfer ?? "—"}</td><td>{samples[2]?.transfer ?? "—"}</td></tr>
      </tbody>
    </table>
    <p className="wall-note">За единицу взят импульс одного удара при исходной скорости. В модели видна только скорость поперёк стенки.</p>
    {first && second && <p className="wall-observation">Импульс за то же время вырос в {second.transfer / first.transfer} раза. На той же площади среднее давление выросло во столько же раз.</p>}
    <div className="sr-only" role="status">{complete ? `Ударов ${hits}, импульс стенке ${transfer} условных единиц.` : ""}</div>
  </section>;
}

const plateTemperatures = [
  { label: "Холоднее", delta: -50 },
  { label: "При 20 °C", delta: 0 },
  { label: "Теплее", delta: 50 },
];
const steelExpansion = 12e-6;
const plateSize = (length, delta) => (length * (1 + steelExpansion * delta)).toFixed(3).replace(".", ",");

export function ExpansionPlate() {
  const title = useId();
  const [delta, setDelta] = useState(0);
  const outlineMagnification = 220;
  const drawnScale = 1 + steelExpansion * delta * outlineMagnification;
  const temperature = 20 + delta;
  const temperatureLabel = temperature.toLocaleString("ru").replace("-", "−");
  return <section className="expansion-plate" aria-labelledby={title} data-nodrag>
    <h3 id={title}>Станет ли отверстие шире?</h3>
    <p className="expansion-setup">Свободная стальная пластина. Сравни её с контуром при 20 °C.</p>
    <div className="expansion-panel">
      <div className="expansion-drawing" data-temperature={delta < 0 ? "cold" : delta > 0 ? "warm" : "base"} aria-hidden="true">
        <img className="expansion-current" src="/art/lesson-plates/steel-plate.webp" alt="" style={{"--plate-zoom":drawnScale}} />
        <span className="expansion-baseline" />
        <span className="expansion-hole-guide" />
        <span className="expansion-center" />
      </div>
      <div className="expansion-measure" role="status">
        <b>{temperatureLabel} °C</b>
        <dl>
          <div><dt>Сторона</dt><dd>{plateSize(80, delta)} мм</dd></div>
          <div><dt>Диаметр</dt><dd>{plateSize(30, delta)} мм</dd></div>
        </dl>
      </div>
    </div>
    <ToggleGroup type="single" value={String(delta)} className="expansion-controls" aria-label="Температура пластины" onValueChange={value => {
      if (value !== "") setDelta(Number(value));
    }}>
      {plateTemperatures.map(item => <ToggleGroupItem key={item.delta} value={String(item.delta)}>{item.label}</ToggleGroupItem>)}
    </ToggleGroup>
    <p className="expansion-note">Пунктир отмечает исходные края пластины и отверстия. На рисунке изменение увеличено.</p>
  </section>;
}

const reactionPieces = [
  { symbol: "\\mathrm{Al}", nucleons: 27, charge: 13 },
  { symbol: "\\mathrm{He}", nucleons: 4, charge: 2 },
  { symbol: "\\mathrm{P}", nucleons: 30, charge: 15 },
];
const candidates = [
  { name: "Протон", symbol: "\\mathrm{H}", nucleons: 1, charge: 1 },
  { name: "Нейтрон", symbol: "\\mathrm{n}", nucleons: 1, charge: 0 },
  { name: "Альфа-частица", symbol: "\\mathrm{He}", nucleons: 4, charge: 2 },
];
const nuclearTex = ({ symbol, nucleons, charge }) => `{}^{${nucleons}}_{${charge}}${symbol}`;

const decayCases = [
  {
    key: "alpha", label: "α", name: "Альфа-распад",
    source: { name: "Уран-238", symbol: "\\mathrm{U}", nucleons: 238, charge: 92 },
    daughter: { name: "Торий-234", symbol: "\\mathrm{Th}", nucleons: 234, charge: 90 },
    release: "Ядро гелия (2 протона и 2 нейтрона)",
    releaseTex: "{}^{4}_{2}\\mathrm{He}",
  },
  {
    key: "beta", label: "β⁻", name: "Бета-минус-распад",
    source: { name: "Углерод-14", symbol: "\\mathrm{C}", nucleons: 14, charge: 6 },
    daughter: { name: "Азот-14", symbol: "\\mathrm{N}", nucleons: 14, charge: 7 },
    release: "Электрон и электронное антинейтрино",
    releaseTex: "{}^{0}_{-1}\\mathrm{e} + \\bar{\\nu}_{e}",
  },
  {
    key: "gamma", label: "γ", name: "Гамма-переход",
    source: { name: "Барий-137", symbol: "\\mathrm{Ba}^{*}", nucleons: 137, charge: 56, excited: true },
    daughter: { name: "Барий-137", symbol: "\\mathrm{Ba}", nucleons: 137, charge: 56 },
    release: "Фотон",
    releaseTex: "\\gamma",
  },
];

function DecayNucleus({ nucleus, label }) {
  return <div className="decay-nucleus">
    <span>{label}</span><div aria-hidden="true"><Tex tex={nuclearTex(nucleus)} /></div><b>{nucleus.name}</b>
    {nucleus.excited && <small>возбуждён</small>}
  </div>;
}

export function DecayProducts() {
  const [mode, setMode] = useState(decayCases[0].key);
  const { source, daughter, release, releaseTex } = decayCases.find(item => item.key === mode);
  const rows = [
    { name:"Нуклоны, A", before:source.nucleons, after:daughter.nucleons },
    { name:"Протоны, Z", before:source.charge, after:daughter.charge },
  ];
  return <div className="decay-workbench lesson-figure-experiment" data-nodrag>
    <ToggleGroup type="single" value={mode} onValueChange={value => value && setMode(value)} aria-label="Тип превращения"
      className="decay-mode">
      {decayCases.map(item => <ToggleGroupItem key={item.key} value={item.key} aria-label={item.name}>{item.label}</ToggleGroupItem>)}
    </ToggleGroup>
    <div aria-live="polite" aria-atomic="true">
      <div className="decay-nuclei">
        <DecayNucleus nucleus={source} label="До" /><span aria-hidden="true">→</span><DecayNucleus nucleus={daughter} label="После" />
      </div>
      <div className="decay-release"><span aria-hidden="true"><Tex tex={releaseTex} /></span><span>{release}</span></div>
      <dl className="decay-counts">
        {rows.map(row => <div key={row.name}>
          <dt>{row.name}</dt>
          <dd aria-label={`Было ${row.before}, стало ${row.after}`}>{row.before}<span aria-hidden="true">→</span>{row.after}</dd>
        </div>)}
      </dl>
    </div>
  </div>;
}

export function NuclearBalance() {
  const [revealed, setRevealed] = useState(false);
  const suffix = revealed ? "1" : "?";
  return <div className="nitrogen-example" data-nodrag>
    <div className="reaction-equation" role="img"
      aria-label={revealed ? "Азот-14 и гелий-4 дают кислород-17 и протон." : "Азот-14 и гелий-4 дают кислород-17 и неизвестную частицу."}>
      <Tex tex="{}^{14}_{7}\mathrm{N} + {}^{4}_{2}\mathrm{He}" />
      <span aria-hidden="true">→</span>
      <Tex tex={revealed ? "{}^{17}_{8}\\mathrm{O} + {}^{1}_{1}\\mathrm{H}" : "{}^{17}_{8}\\mathrm{O} + ?"} />
    </div>
    <dl className="nitrogen-checks">
      <div><dt>Нуклоны</dt><dd>14 + 4 = 17 + {suffix}</dd></div>
      <div><dt>Заряд в единицах e</dt><dd>7 + 2 = 8 + {suffix}</dd></div>
    </dl>
    <div className="nitrogen-actions">
      <Button type="button" variant="secondary" className="nitrogen-reveal" onClick={() => setRevealed(value => !value)}>
        {revealed ? "Скрыть ответ" : "Показать частицу"}
      </Button>
      <span role="status">{revealed ? "Протон" : ""}</span>
    </div>
  </div>;
}

export function ReactionLedger() {
  const title = useId();
  const [choice, setChoice] = useState("");
  const particle = candidates.find(candidate => candidate.name === choice);
  const rows = [
    { key: "nucleons", label: "Нуклоны", letter: "A" },
    { key: "charge", label: "Заряд в единицах e", letter: "Z" },
  ].map(row => {
    const [a, b, c] = reactionPieces.map(piece => piece[row.key]);
    return { ...row, total: a + b, known: c, candidate: particle?.[row.key] };
  });
  const balanced = particle !== undefined && rows.every(row => row.total === row.known + row.candidate);
  const [aluminum, helium, phosphorus] = reactionPieces;
  return <section className="reaction-ledger" aria-labelledby={title} data-nodrag>
    <h3 id={title}>Теперь попробуй с алюминием</h3>
    <p className="reaction-question">Уже известно, что образовалось ядро фосфора. Какая ещё частица вылетела?</p>
    <div className="reaction-equation" role="img" aria-label={`Исходные ядра: алюминий-27 и гелий-4. Продукты на схеме: фосфор-30 и ${particle?.name.toLowerCase() ?? "неизвестная частица"}.`}>
      <Tex tex={`${nuclearTex(aluminum)} + ${nuclearTex(helium)}`} />
      <span aria-hidden="true">→</span>
      <Tex tex={`${nuclearTex(phosphorus)} + ${particle ? nuclearTex(particle) : "?"}`} />
    </div>
    <ToggleGroup type="single" className="reaction-candidates" aria-label="Пропущенная частица" value={choice} onValueChange={setChoice}>
      {candidates.map(candidate => <ToggleGroupItem value={candidate.name} key={candidate.name}>
        <span aria-hidden="true"><Tex tex={nuclearTex(candidate)} /></span>
        {candidate.name}
      </ToggleGroupItem>)}
    </ToggleGroup>
    <dl className="reaction-rows" aria-live="polite">
      {rows.map(row => {
        const matches = row.total === row.known + row.candidate;
        return <div key={row.key} data-match={particle && matches}>
          <dt><b>{row.letter}</b> {row.label}</dt>
          <dd><span>{row.total} {particle && !matches ? "≠" : "="} {row.known} + {row.candidate ?? "?"}</span>
            {particle && (matches ? <Check aria-label="Сходится" role="img" /> : <X aria-label="Расходится" role="img" />)}
          </dd>
        </div>;
      })}
    </dl>
    <p className="reaction-result" role="status">{balanced ? "Оба баланса сошлись. Вылетел нейтрон." : "Проверь, совпадают ли обе суммы до и после реакции."}</p>
  </section>;
}
