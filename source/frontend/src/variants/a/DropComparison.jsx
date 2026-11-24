import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { motionState } from "@/lib/studyModels";
import { updateTrialReading, useLessonTrial } from "./useLessonTrial";

const startHeight = 1.25;
const gravity = 10;
const fallTime = Math.sqrt(2 * startHeight / gravity);
const replayDuration = 2.5;
const leftX = 3, rightX = 15, xPerMetre = 37;
// The raster table and floor meet the ball bottoms at these heights.
const startY = 33.1, groundY = 93.1;
const sampleSteps = Array.from({ length: 5 }, (_, i) => i * fallTime / 5);
const amount = new Intl.NumberFormat("ru", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format;
const yAt = displacement => Math.min(groundY, startY - (groundY - startY) * displacement / startHeight);
const fallEasing = "cubic-bezier(0.333333, 0, 0.666667, 0.333333)";
const rulerClip = shift => `inset(0 ${100 - rightX - shift + leftX}% 0 0)`;

function Ball({ x, y, released = false, echo = false }) {
  return <span className="drop-ball" data-released={released || undefined} data-echo={echo || undefined} hidden={echo}
    style={{ left: x + "%", top: y + "%" }} />;
}

export function DropComparison() {
  const title = useId();
  const [launchSpeed, setLaunchSpeed] = useState(2);
  const falling = useRef(null), pushed = useRef(null), ruler = useRef(null);
  const trail = useRef(null), visibleMarks = useRef(0);
  const timeReading = useRef(null), heightReading = useRef(null), shiftReading = useRef(null);
  const lastReading = useRef(null);
  const flight = useRef([]);
  const stopFlight = useCallback(() => {
    for (const animation of flight.current) animation.cancel();
    flight.current = [];
  }, []);
  useEffect(() => stopFlight, [stopFlight]);

  const drawFrame = useCallback(time => {
    const modelTime = fallTime * time / replayDuration;
    if (time === replayDuration) stopFlight();
    if (!flight.current.length) {
      const drop = yAt(motionState(0, -gravity, modelTime).x) - startY;
      const shift = xPerMetre * launchSpeed * modelTime;
      falling.current.style.transform = `translateY(${drop}%)`;
      pushed.current.style.transform = `translateX(${shift}%)`;
      ruler.current.style.clipPath = rulerClip(shift);
    }
    let count = 0;
    while (count < sampleSteps.length && sampleSteps[count] < modelTime) count++;
    if (count !== visibleMarks.current) {
      for (let i = 0; i < sampleSteps.length; i++) trail.current.children[i].hidden = i >= count;
      visibleMarks.current = count;
    }
    const readingTime = Math.floor((modelTime + 1e-9) * 10) / 10;
    if (lastReading.current?.time === readingTime && lastReading.current.speed === launchSpeed) return;
    lastReading.current = { time: readingTime, speed: launchSpeed };
    const measuredHeight = startHeight + motionState(0, -gravity, readingTime).x;
    updateTrialReading(timeReading.current, amount(readingTime) + " с");
    updateTrialReading(heightReading.current, amount(Math.max(0, measuredHeight)) + " м");
    updateTrialReading(shiftReading.current, amount(launchSpeed * readingTime) + " м");
  }, [launchSpeed, stopFlight]);
  const { playing, complete, launch, seek } = useLessonTrial(replayDuration, { drawFrame });

  function launchFlight() {
    if (playing) return;
    stopFlight();
    launch();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !falling.current.animate) return;
    const shift = xPerMetre * launchSpeed * fallTime;
    const options = { duration: replayDuration * 1000, fill: "forwards" };
    const start = document.timeline.currentTime;
    flight.current = [
      falling.current.animate([{ transform: "translateY(0%)" }, { transform: `translateY(${groundY - startY}%)` }], { ...options, easing: fallEasing }),
      pushed.current.animate([{ transform: "translateX(0%)" }, { transform: `translateX(${shift}%)` }], options),
      ruler.current.animate([{ clipPath: rulerClip(0) }, { clipPath: rulerClip(shift) }], options),
    ];
    if (start !== null) for (const animation of flight.current) animation.startTime = start;
  }

  return <section className="drop-comparison" aria-labelledby={title} data-nodrag>
    <h3 id={title}>Два шарика стартуют вместе</h3>
    <p className="drop-question">Один падает прямо, второй летит вправо. Какой первым коснётся пола?</p>
    <div className="drop-viewport" aria-hidden="true">
      <img src="/art/lesson-hooks/dva-sharika-scene-v1-600.webp"
        srcSet="/art/lesson-hooks/dva-sharika-scene-v1-600.webp 600w, /art/lesson-hooks/dva-sharika-scene-v1-1200.webp 1200w"
        sizes="(max-width: 400px) 429px, (max-width: 628px) 108vw, 678px"
        width="1200" height="400" alt="" draggable="false" />
      <div className="drop-flight-zone">
        <div ref={trail}>
          {sampleSteps.map(sample => <Ball key={sample} x={rightX + xPerMetre * motionState(launchSpeed, 0, sample).x}
            y={yAt(motionState(0, -gravity, sample).x)} echo />)}
        </div>
        <div ref={falling} className="drop-motion-layer">
          <span ref={ruler} className="drop-heightline" style={{ left: leftX + "%", top: startY + "%" }} />
          <Ball x={leftX} y={startY} released />
          <div ref={pushed} className="drop-motion-layer"><Ball x={rightX} y={startY} /></div>
        </div>
      </div>
    </div>
    <ul className="drop-legend">
      <li><i /> Отпущен</li><li><i /> Толкнули вбок</li><li><span /> Одна высота</li>
    </ul>
    <div className="drop-controls">
      <div><p>Начальная скорость вправо</p>
        <ToggleGroup type="single" value={String(launchSpeed)} aria-label="Начальная скорость вправо" className="drop-speeds" onValueChange={value => {
          if (!value || launchSpeed === Number(value)) return;
          stopFlight();
          seek(0);
          setLaunchSpeed(Number(value));
        }}>
          <ToggleGroupItem value="2">2 м/с</ToggleGroupItem>
          <ToggleGroupItem value="4">4 м/с</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <Button type="button" className="drop-launch" onClick={launchFlight} aria-disabled={playing || undefined}>
        {complete ? <RotateCcw aria-hidden="true" /> : <Play aria-hidden="true" />}
        {playing ? "Шарики летят" : complete ? "Снова" : "Отпустить"}
      </Button>
    </div>
    <dl className="drop-readings">
      <div><dt>Время</dt><dd ref={timeReading}>0,00 с</dd></div>
      <div><dt>Высота обоих</dt><dd ref={heightReading}>1,25 м</dd></div>
      <div><dt>Сдвиг вправо</dt><dd ref={shiftReading}>0,00 м</dd></div>
    </dl>
    <p className="drop-note" role="status">{complete
      ? "Оба коснулись пола через 0,50 с. Точки на пути отмечены через 0,10 с."
      : "Высота старта 1,25 м. Воздухом пренебрегаем. Полёт показан в замедлении."}</p>
  </section>;
}
