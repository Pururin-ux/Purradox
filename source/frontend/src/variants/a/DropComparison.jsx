import { useCallback, useId, useRef, useState } from "react";
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

function Ball({ elementRef, x, y, released = false, echo = false }) {
  return <span ref={elementRef} className="drop-ball" data-released={released || undefined} data-echo={echo || undefined} hidden={echo}
    style={{ left: x + "%", top: y + "%" }} />;
}

export function DropComparison() {
  const title = useId();
  const [launchSpeed, setLaunchSpeed] = useState(2);
  const released = useRef(null), pushed = useRef(null), heightline = useRef(null);
  const trail = useRef(null), visibleMarks = useRef(0);
  const timeReading = useRef(null), heightReading = useRef(null), shiftReading = useRef(null);
  const drawFrame = useCallback(time => {
    const modelTime = fallTime * time / replayDuration;
    const { x: horizontal } = motionState(launchSpeed, 0, modelTime);
    const { x: vertical } = motionState(0, -gravity, modelTime);
    const y = yAt(vertical) + "%";
    const movingX = rightX + xPerMetre * horizontal;
    released.current.style.top = y;
    pushed.current.style.top = y;
    pushed.current.style.left = movingX + "%";
    heightline.current.style.top = y;
    heightline.current.style.width = (movingX - leftX) + "%";
    let count = 0;
    while (count < sampleSteps.length && sampleSteps[count] < modelTime) count++;
    if (count !== visibleMarks.current) {
      for (let i = 0; i < sampleSteps.length; i++) trail.current.children[i].hidden = i >= count;
      visibleMarks.current = count;
    }
    updateTrialReading(timeReading.current, amount(modelTime) + " с");
    updateTrialReading(heightReading.current, amount(Math.max(0, startHeight + vertical)) + " м");
    updateTrialReading(shiftReading.current, amount(horizontal) + " м");
  }, [launchSpeed]);
  const { playing, complete, launch, seek } = useLessonTrial(replayDuration, { drawFrame });

  return <section className="drop-comparison" aria-labelledby={title} data-nodrag>
    <h3 id={title}>Два шарика стартуют вместе</h3>
    <p className="drop-question">Один падает прямо, второй летит вправо. Какой первым коснётся пола?</p>
    <div className="drop-viewport" aria-hidden="true">
      <img src="/art/lesson-hooks/dva-sharika-scene-v1-600.webp"
        srcSet="/art/lesson-hooks/dva-sharika-scene-v1-600.webp 600w, /art/lesson-hooks/dva-sharika-scene-v1-1200.webp 1200w"
        sizes="(max-width: 400px) 429px, (max-width: 628px) 108vw, 678px"
        width="1200" height="400" alt="" draggable="false" />
      <div className="drop-flight-zone">
        <span ref={heightline} className="drop-heightline" style={{ left: leftX + "%" }} />
        <div ref={trail}>
          {sampleSteps.map(sample => <Ball key={sample} x={rightX + xPerMetre * motionState(launchSpeed, 0, sample).x}
            y={yAt(motionState(0, -gravity, sample).x)} echo />)}
        </div>
        <Ball elementRef={released} x={leftX} y={startY} released />
        <Ball elementRef={pushed} x={rightX} y={startY} />
      </div>
    </div>
    <ul className="drop-legend">
      <li><i /> Отпущен</li><li><i /> Толкнули вбок</li><li><span /> Одна высота</li>
    </ul>
    <div className="drop-controls">
      <div><p>Начальная скорость вправо</p>
        <ToggleGroup type="single" value={String(launchSpeed)} aria-label="Начальная скорость вправо" className="drop-speeds" onValueChange={value => {
          if (!value || launchSpeed === Number(value)) return;
          seek(0);
          setLaunchSpeed(Number(value));
        }}>
          <ToggleGroupItem value="2">2 м/с</ToggleGroupItem>
          <ToggleGroupItem value="4">4 м/с</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <Button type="button" className="drop-launch" onClick={launch} aria-disabled={playing || undefined}>
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
