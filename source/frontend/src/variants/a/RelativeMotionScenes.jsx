import { useId, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { motionState } from "@/lib/studyModels";

const art = "/art/lesson-hooks/";
const number = (value) => (value < 0 ? "−" : "") + Math.abs(value).toLocaleString("ru", { maximumFractionDigits: 1 });
const metres = (value) => number(value) + " м";
const seconds = (value) => number(value) + " с";
const horizontal = (value) => value + "%";
const railwayMarks = [-8, -4, 0, 4, 8, 12, 16, 20];
const railwayX = value => 10 + 80 * (value + 8) / 28;
const platformLamp = 12;
const trainSpeed = 4;

export function TrainFrameScene() {
  const title = useId(), timeId = useId();
  const [frame, setFrame] = useState("platform");
  const [time, setTime] = useState(0);
  const { x: car } = motionState(trainSpeed, 0, time);
  const inTrain = frame === "train";
  const origin = inTrain ? car : 0;
  const cat = car - origin;
  const lamp = platformLamp - origin;
  const gap = Math.abs(cat - lamp);
  const description = `${seconds(time)}. Кот: ${metres(cat)}. Фонарь: ${metres(lamp)}. Расстояние ${metres(gap)}.`;

  return <section className="rail-frame" aria-labelledby={title} data-nodrag>
    <div className="rail-frame-head">
      <h3 id={title}>Чей ноль на шкале?</h3>
      <ToggleGroup type="single" className="rail-frame-options" value={frame} onValueChange={value => value && setFrame(value)}
        aria-label="Система отсчёта">
        <ToggleGroupItem value="platform">Платформа</ToggleGroupItem>
        <ToggleGroupItem value="train">Вагон</ToggleGroupItem>
      </ToggleGroup>
    </div>
    <div className="rail-frame-stage" aria-hidden="true">
      <span className="rail-frame-unit">Шкала, м</span>
      <span className="rail-frame-platform" />
      <span className="rail-frame-track" />
      <span className="rail-frame-glow" style={{ left: horizontal(railwayX(lamp)) }} />
      <div className="rail-frame-object rail-frame-lamp" style={{ left: horizontal(railwayX(lamp)) }}>
        <img src={art + "fonar-otschet-v1.webp"} alt="" draggable="false" decoding="async" />
      </div>
      <div className="rail-frame-object rail-frame-train" style={{ left: horizontal(railwayX(cat)) }}>
        <img src={art + "vagon-otschet-v1.webp"} alt="" draggable="false" decoding="async" />
      </div>
      <div className="rail-frame-axis" />
      <i className="rail-frame-pin" style={{ left: horizontal(railwayX(lamp)) }} />
      <i className="rail-frame-pin is-cat" style={{ left: horizontal(railwayX(cat)) }} />
      <span className="rail-chain" style={{
        left: horizontal(railwayX(Math.min(cat,lamp))),
        width: horizontal(Math.abs(railwayX(cat)-railwayX(lamp))),
      }} />
      <div className="rail-frame-scale">
        {railwayMarks.map(value => <span key={value} data-zero={value === 0 || undefined}
          style={{ left: horizontal(railwayX(value)) }}>{number(value)}</span>)}
      </div>
    </div>
    <div className="rail-frame-measurements">
      <dl>
        <div><dt>Кот</dt><dd>{metres(cat)}</dd></div>
        <div><dt>Фонарь</dt><dd>{metres(lamp)}</dd></div>
        <div><dt>Между ними</dt><dd>{metres(gap)}</dd></div>
      </dl>
      <p>{inTrain ? "Ноль на скамейке кота." : "Ноль там, где кот был в начале."} Ось направлена вправо.</p>
      <div className="rail-frame-time"><span id={timeId}>Время</span><b>{seconds(time)}</b></div>
      <Slider className="frame-time-slider" min={0} max={5} step={0.5} value={[time]} onValueChange={([value]) => setTime(value)}
        thumbProps={{ "aria-labelledby":timeId, "aria-valuetext":description }} />
      <p className="rail-frame-task">Поставь 2 с и переключи систему отсчёта. Какие числа изменились?</p>
    </div>
  </section>;
}

const firstGap = 12;
const defaultSpeeds = [6,4];
const rideX = value => 10 + value / 36 * 80;
const bicycleMarks = [0,9,18,27,36];

function RideMarker({ name, asset, position, leader }) {
  return <div className="chase-lane" data-leader={leader || undefined}>
    <span className="chase-road" />
    <figure className="chase-rider" style={{ left: horizontal(rideX(position)) }}>
      <img src={asset} alt="" draggable="false" decoding="async" />
      <figcaption><span>{name}</span><b>{metres(position)}</b></figcaption>
    </figure>
  </div>;
}

export function BicycleGapScene() {
  const title = useId(), timeId = useId();
  const [time, setTime] = useState(2);
  const [tempo, setTempo] = useState("usual");
  const slowDown = tempo === "slower" ? 1 : 0;
  const [fast, slow] = defaultSpeeds.map(speed => speed - slowDown);
  const rear = motionState(fast, 0, time).x;
  const front = firstGap + motionState(slow, 0, time).x;
  const gap = front - rear;
  const gapReading = `${seconds(time)}, положение заднего ${metres(rear)}, переднего ${metres(front)}, между ними ${metres(gap)}`;

  return <section className="chase-study" aria-labelledby={title} data-nodrag>
    <header className="chase-head">
      <div><h3 id={title}>Замер на набережной</h3><p>В начале между велосипедами 12 м.</p></div>
      <ToggleGroup type="single" className="chase-paces" aria-label="Скорости заднего и переднего велосипедистов"
        value={tempo} onValueChange={value => value && setTempo(value)}>
        <ToggleGroupItem value="usual">6 и 4 м/с</ToggleGroupItem>
        <ToggleGroupItem value="slower">5 и 3 м/с</ToggleGroupItem>
      </ToggleGroup>
    </header>
    <div className="chase-map" aria-hidden="true">
      <div className="chase-scale">
        {bicycleMarks.map(value => <i key={value} style={{ left: horizontal(rideX(value)) }} />)}
      </div>
      <RideMarker name="Задний" asset={art + "velosiped-szadi-v1.webp"} position={rear} />
      <RideMarker name="Передний" asset={art + "velosiped-vperedi-v1.webp"} position={front} leader />
      <div className="chase-measuring-line">
        <span style={{ left:horizontal(rideX(rear)),width:horizontal(rideX(front)-rideX(rear)) }} />
        {bicycleMarks.map(value => <i key={value} style={{ left:horizontal(rideX(value)) }}>{value}</i>)}
      </div>
    </div>
    <div className="chase-readings">
      <div><span>Расстояние<br />через <b>{seconds(time)}</b></span><strong>{metres(gap)}</strong></div>
      <div><span>Скорость сближения</span><strong>{number(fast - slow)} м/с</strong></div>
    </div>
    <div className="chase-clock">
      <span id={timeId}>Время от старта</span><b>{seconds(time)}</b>
      <Slider className="chase-slider" min={0} max={6} step={1} value={[time]} onValueChange={([value]) => setTime(value)}
        thumbProps={{ "aria-labelledby":timeId, "aria-valuetext":gapReading }} />
    </div>
    <p className="chase-question">Замедли обоих. Проверь, через сколько секунд они поравняются.</p>
  </section>;
}
