import { memo, useCallback, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { circularOrbitComparison, uniformLift } from "@/lib/studyModels";
import { LessonProp } from "./LessonArt";
import { updateTrialReading, useLessonTrial } from "./useLessonTrial";

const art = "/art/lesson-hooks/";
const amount = (number, precision = 0) => number.toLocaleString("ru", { maximumFractionDigits: precision });
const earthRadius = 6371;
const orbitHeight = 1600;
const orbitRadius = earthRadius + orbitHeight;
const earthMu = 398600;
const orbitScale = 100 / orbitRadius;
const earthSize = 2 * earthRadius * orbitScale;
const orbitOrigin = { x: 118, y: 137 };

export function OrbitComparison() {
  const timeId = useId();
  const [minutes, setMinutes] = useState(10);
  const flight = circularOrbitComparison(earthMu, orbitRadius, minutes * 60);
  const tangentHeight = flight.tangentRadius - earthRadius;
  const satellite = [orbitOrigin.x + flight.orbitX * orbitScale, orbitOrigin.y - flight.orbitY * orbitScale];
  const startY = orbitOrigin.y - orbitRadius * orbitScale;
  const tangentX = orbitOrigin.x + flight.tangentX * orbitScale;
  const orbitText = amount(orbitHeight) + " км";
  const tangentText = amount(tangentHeight) + " км";
  const timeText = minutes + " мин";

  return <div className="orbit-comparison" data-nodrag>
    <svg viewBox="12 6 279 237" role="img" aria-label={"Через " + timeText + " высота на орбите " + orbitText +
      ", без тяготения высота " + tangentText + "."}>
      <image href={art + "zemlya-orbita-v1.webp"} x={orbitOrigin.x - earthSize / 2} y={orbitOrigin.y - earthSize / 2}
        width={earthSize} height={earthSize} preserveAspectRatio="none" />
      <circle cx={orbitOrigin.x} cy={orbitOrigin.y} r="100" fill="none" stroke="#7e7baa" strokeWidth="1.1" strokeDasharray="3 4" />
      <path d={"M" + orbitOrigin.x + " " + startY + " H275"} stroke="#b8afce" strokeWidth="1.5" strokeDasharray="4 5" />
      <circle cx={orbitOrigin.x} cy={startY} r="3.5" fill="#fff3e4" />
      {minutes > 0 && <>
        <path d={"M" + orbitOrigin.x + " " + startY + " A100 100 0 0 1 " + satellite.join(" ")}
          fill="none" stroke="#ffd295" strokeWidth="2.5" strokeLinecap="round" />
        <path d={"M" + tangentX + " " + startY + " L" + satellite.join(" ")} stroke="#a39fbf" strokeWidth="1.3" strokeDasharray="3 4" />
        <circle cx={tangentX} cy={startY} r="5" stroke="#dedaf5" fill="#38334f" strokeWidth="2" />
      </>}
      <image href={art + "sputnik-orbita-v1.webp"} x={satellite[0] - 26} y={satellite[1] - 11}
        width="52" height="19" transform={"rotate(" + flight.angle * 180 / Math.PI + " " + satellite.join(" ") + ")"} />
      <circle cx={satellite[0]} cy={satellite[1]} r="2.2" fill="#ffe2b0" />
    </svg>
    <dl className="orbit-readings">
      <div><dt><i />На орбите</dt><dd>{orbitText}</dd></div>
      <div><dt><i />Без тяготения</dt><dd>{tangentText}</dd></div>
    </dl>
    <div className="orbit-clock">
      <span id={timeId}>После старта</span><output>{timeText}</output>
      <Slider className="lesson-reflection-slider" min={0} max={15} step={1} value={[minutes]}
        onValueChange={([value]) => setMinutes(value)}
        thumbProps={{ "aria-labelledby": timeId, "aria-valuetext": timeText + ", на орбите " + orbitText + ", без тяготения " + tangentText }} />
    </div>
  </div>;
}

const liftingTimes = [2, 4];
const topLift = 2;
const weight = 50;
const liftStartTime = 2;
const liftStep = .5;
const liftSliderTime = time => Math.floor(time / liftStep) * liftStep;
const liftHeight = new Intl.NumberFormat("ru", { maximumFractionDigits: 2 }).format;
const liftNumber = new Intl.NumberFormat("ru", { maximumFractionDigits: 1 }).format;
const initialLoads = liftingTimes.map(duration => uniformLift(weight, topLift, duration, liftStartTime));

const LiftLane = memo(function LiftLane({ duration, railRef, finished }) {
  return <div className="lift-lane" data-finished={finished}>
    <h3>За {duration} с</h3>
    <div ref={railRef} className="lift-rail" aria-hidden="true">
      <i className="lift-drum" />
      <span className="lift-rope" />
      <img className="lift-weight" src={art + "gruz-lebedki-v1.webp"} alt="" draggable="false" width="122" height="185" />
    </div>
  </div>;
});

export function PowerLifts() {
  const timeId = useId();
  const fastRail = useRef(null), slowRail = useRef(null);
  const readings = useRef(null), clock = useRef(null);
  const drawFrame = useCallback(time => {
    const [heightRow, workRow] = readings.current.rows;
    const rails = [fastRail.current, slowRail.current];
    liftingTimes.forEach((duration, index) => {
      const { height, work } = uniformLift(weight, topLift, duration, time);
      rails[index].style.setProperty("--lift-height", height / topLift);
      updateTrialReading(heightRow.cells[index + 1], liftHeight(height) + " м");
      updateTrialReading(workRow.cells[index + 1], liftNumber(work) + " Дж");
    });
    updateTrialReading(clock.current, liftNumber(time) + " с");
  }, []);
  const { time, playing, complete, launch, seek } = useLessonTrial(liftingTimes[1], {
    drawFrame, readAt: liftSliderTime, initialTime: liftStartTime,
  });
  const sliderTime = liftSliderTime(time);

  return <div className="power-lifts" data-nodrag>
    <div className="lift-range">
      <span aria-hidden="true" className="lift-goal">2 м</span>
      <span aria-hidden="true" className="lift-start">0</span>
      <LiftLane duration={liftingTimes[0]} railRef={fastRail} finished={time >= liftingTimes[0]} />
      <LiftLane duration={liftingTimes[1]} railRef={slowRail} finished={time >= liftingTimes[1]} />
    </div>
    <table className="lift-reading" aria-label="Показания лебёдок">
      <thead className="sr-only"><tr><th scope="col">Величина</th>
        {liftingTimes.map(duration => <th scope="col" key={duration}>Груз за {duration} с</th>)}
      </tr></thead>
      <tbody ref={readings}>
        <tr><th scope="row">Высота</th>{initialLoads.map((load, index) => <td key={liftingTimes[index]}>{liftHeight(load.height)} м</td>)}</tr>
        <tr><th scope="row">Работа</th>{initialLoads.map((load, index) => <td key={liftingTimes[index]}>{liftNumber(load.work)} Дж</td>)}</tr>
        <tr><th scope="row">Средняя мощность</th>{initialLoads.map((load, index) => <td key={liftingTimes[index]}>{amount(load.averagePower)} Вт</td>)}</tr>
      </tbody>
    </table>
    <div className="lesson-reflection-control lift-clock">
      <span id={timeId}>Время от старта</span><output ref={clock}>{liftNumber(liftStartTime)} с</output>
      <Slider className="lesson-reflection-slider" min={0} max={liftingTimes[1]} step={liftStep}
        value={[sliderTime]} onValueChange={([value]) => seek(value)}
        thumbProps={{ "aria-labelledby": timeId, "aria-valuetext": liftNumber(sliderTime) + " с" }} />
    </div>
    <Button type="button" variant="secondary" className="lift-launch" aria-disabled={playing || undefined} onClick={launch}>
      {complete ? <RotateCcw aria-hidden="true" /> : <Play aria-hidden="true" />}
      {playing ? "Грузы поднимаются" : "Пустить обе лебёдки"}
    </Button>
    <span className="sr-only" role="status">{complete ? "Оба груза подняты. Каждая лебёдка совершила 100 Дж работы." : ""}</span>
  </div>;
}

const vaporStates = {
  sparse: { molecules: 4, volume: 1, result: "Пара становится больше." },
  saturated: { molecules: 12, volume: 1, result: "Пар и вода обмениваются молекулами поровну." },
  compressed: { molecules: 12, volume: .5, result: "Пара становится меньше." },
  resettled: { molecules: 6, volume: .5, result: "В меньшем объёме снова насыщенный пар." },
};
const vaporPoints = [
  [63,.22],[155,.46],[227,.21],[271,.63],[96,.63],[197,.67],
  [109,.28],[251,.46],[72,.49],[231,.78],[141,.75],[188,.32],
];
const evaporation = 6;

export function VaporBalance() {
  const [mode, setMode] = useState("sparse");
  const [settled, setSettled] = useState(false);
  const state = mode === "compressed" && settled ? "resettled" : mode;
  const { molecules, volume, result } = vaporStates[state];
  const condensation = evaporation * molecules / (12 * volume);
  const waterY = 141;
  const piston = waterY - 80 * volume;
  return <div className="vapor-exchange" data-nodrag>
    <ToggleGroup type="single" className="vapor-options" value={mode} onValueChange={value => {
      if (value) { setMode(value); setSettled(false); }
    }}
      aria-label="Состояние пара">
      <ToggleGroupItem value="sparse">Мало пара</ToggleGroupItem>
      <ToggleGroupItem value="saturated" aria-label="Насыщенный пар">Насытили</ToggleGroupItem>
      <ToggleGroupItem value="compressed" aria-label="Сжали пар вдвое">Сжали</ToggleGroupItem>
    </ToggleGroup>
    <svg viewBox="0 0 330 188" role="img" aria-label={"Закрытый сосуд с поршнем. Объём пара " +
      (volume === 1 ? "исходный." : "уменьшен вдвое.") + " Число точек в паре " + molecules + "."}
    >
      <path d={`M64 ${waterY}H266V167Q266 173 260 173H70Q64 173 64 167Z`} fill="#89b5c9" />
      <path d={`M64 ${waterY}H266`} stroke="#3b7582" strokeWidth="2" />
      <LessonProp name="vapor-cylinder" x={60} y={47} width={210} height={131} fit="none" />
      <LessonProp name="brass-plunger" x={65} y={piston-61} width={200} height={61} fit="none" />
      {volume < 1 && <path d="M63 61H267" stroke="#a291b2" strokeWidth="2" strokeDasharray="4 5" />}
      {vaporPoints.slice(0, molecules).map(([x, fraction]) =>
        <circle key={x} cx={165 + (x-165)*.63} cy={piston + fraction * (waterY - piston)} r="3" fill="#976a8d" />)}
      <path d="M130 156V117m-7 8l7-8 7 8" fill="none" stroke="#7d4d22" strokeWidth={2.4 + evaporation / 6}
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M202 117V156m-7-8l7 8 7-8" fill="none" stroke="#285a6d" strokeWidth={2.4 + condensation / 6}
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <div className="vapor-readings" role="status">
      <dl>
        <div><dt><ArrowUp aria-hidden="true" />Ушло в пар</dt><dd>{evaporation}</dd></div>
        <div><dt><ArrowDown aria-hidden="true" />Вернулось в воду</dt><dd>{condensation}</dd></div>
      </dl>
      <p>{result}</p>
    </div>
    {mode === "compressed" && <Button type="button" variant="secondary" className="vapor-settle" onClick={() => setSettled(value => !value)}>
      {settled ? "Сразу после сжатия" : "Дождаться равновесия"}
    </Button>}
  </div>;
}

const airWavelength = 600;
const waterIndex = 4 / 3;
const waterWavelength = airWavelength / waterIndex;
const airAngles = [0, 30, 60];
const pixelLambda = 32;
const boundary = { x: 160, y: 104 };

// Translate each crest by k wavelengths along the ray, then draw it perpendicular to the ray.
function wavefronts(angle, spacing) {
  const radians = angle * Math.PI / 180;
  const dx = Math.sin(radians), dy = Math.cos(radians);
  return Array.from({ length: 15 }, (_, index) => {
    const k = index - 7;
    const x = boundary.x + k * spacing * dx;
    const y = boundary.y + k * spacing * dy;
    return { k, x1:x - 350 * dy, x2:x + 350 * dy, y1:y + 350 * dx, y2:y - 350 * dx };
  });
}

export function RefractionFronts() {
  const [angle, setAngle] = useState(30);
  const clipId = useId();
  const toRadians = number => number * Math.PI / 180;
  const beta = Math.asin(Math.sin(toRadians(angle)) / waterIndex) * 180 / Math.PI;
  const angleLabel = amount(beta, 1) + "°";
  const incidentX = boundary.x - 54 * Math.tan(toRadians(angle));
  const waterX = boundary.x + 60 * Math.tan(toRadians(beta));
  const arrowline = "M" + incidentX + " 50L160 104L" + waterX + " 164";
  return <div className="refraction-fronts" data-nodrag>
    <svg viewBox="0 0 320 205" role="img"
      aria-label={"Луч падает из воздуха под углом " + angle + " градусов. Угол в воде " + angleLabel +
        " Длина волны в воздухе 600, в воде 450 нанометров."}>
      <defs>
        <clipPath id={clipId + "-air"}><rect x="8" y="9" width="304" height="95" /></clipPath>
        <clipPath id={clipId + "-water"}><rect x="8" y="104" width="304" height="92" /></clipPath>
        <marker id={clipId + "-arrow"} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M1 1L5 3L1 5" fill="none" stroke="#69436e" strokeWidth="1.15" strokeLinejoin="round" />
        </marker>
      </defs>
      <path d="M8 9H312V104H8Z" fill="#f7eedf" />
      <path d="M8 104H312V196H8Z" fill="#d9edf0" />
      <g clipPath={"url(#" + clipId + "-air)"} stroke="#b7865a" strokeWidth="1.3">
        {wavefronts(angle, pixelLambda).map(({ k, ...line }) => <line key={k} {...line} />)}
      </g>
      <g clipPath={"url(#" + clipId + "-water)"} stroke="#659b9f" strokeWidth="1.3">
        {wavefronts(beta, pixelLambda / waterIndex).map(({ k, ...line }) => <line key={k} {...line} />)}
      </g>
      <path d="M8 104H312" stroke="#688a9e" strokeWidth="1.5" />
      <path d="M160 24V192" stroke="#7c7186" strokeWidth="1.5" strokeDasharray="4 4" />
      <path d={arrowline} fill="none" stroke="#fff6ef" strokeWidth="6" strokeLinejoin="round" />
      <path d={arrowline} fill="none" stroke="#69436e" strokeWidth="2.7" strokeLinejoin="round"
        markerEnd={"url(#" + clipId + "-arrow)"} />
      <circle cx={boundary.x} cy={boundary.y} r="3.5" fill="#69436e" />
      <rect x="15" y="17" width="70" height="28" rx="8" fill="#fff5e8" />
      <text x="50" y="36" textAnchor="middle" fill="#68452b" fontSize="17">Воздух</text>
      <rect x="231" y="161" width="73" height="28" rx="8" fill="#edf8f7" />
      <text x="267" y="180" textAnchor="middle" fill="#285665" fontSize="17">Вода</text>
    </svg>
    <ToggleGroup className="refraction-angles" aria-label="Угол падения из воздуха"
      type="single" value={String(angle)} onValueChange={value => value && setAngle(Number(value))}>
      {airAngles.map(value => <ToggleGroupItem value={String(value)} key={value}>{value}°</ToggleGroupItem>)}
    </ToggleGroup>
    <div aria-live="polite" aria-atomic="true">
      <dl className="refraction-readings">
        <div><dt>Угол в воде</dt><dd>{angleLabel}</dd></div>
        <div><dt>Длина волны</dt><dd>{airWavelength} → {waterWavelength} нм</dd></div>
      </dl>
      <p className="refraction-frequency">Частота с обеих сторон ≈ 500 ТГц.</p>
    </div>
  </div>;
}
