import { memo, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fmt } from "@/lib/format";

const HEIGHT = 168;
const TRACK_Y = 80;
const TOP = 26;
const BOTTOM = 130;

export const MotionStudyView = memo(function MotionStudyView({ kinematics: k, duration, view, timeRef, drawFrame }) {
  const frame = useRef(null);
  const reveal = useRef(null);
  const current = useRef(null);
  const trail = useRef(null);
  const clip = useId();
  const [width, setWidth] = useState(300);
  useLayoutEffect(() => {
    const node = frame.current;
    const fit = measured => {
      const next = Math.round(measured);
      if (next > 0) setWidth(next);
    };
    const measure = () => fit(node.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(([entry]) => fit(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const speedPlot = view === "speed";
  const {left, right, speedMax, distanceMax, timeX, speedY, positionX, line, area} = useMemo(() => {
    const left = 34, right = width - 18;
    const speedMax = Math.ceil(Math.max(k.vAt(0), k.vAt(duration), 4) / 2) * 2;
    const distanceMax = Math.max(k.xAt(duration), 1);
    const timeX = time => left + time / duration * (right - left);
    const speedY = speed => BOTTOM - speed / speedMax * (BOTTOM - TOP);
    const positionX = time => left + k.xAt(time) / distanceMax * (right - left);
    const points = [0, Math.min(k.tStop, duration), duration].map(time => `${timeX(time)},${speedY(k.vAt(time))}`);
    return {
      left, right, speedMax, distanceMax, timeX, speedY, positionX,
      line: `M${points.join(" L")}`, area: `M${left},${BOTTOM} L${points.join(" L")} L${right},${BOTTOM} Z`,
    };
  }, [duration, k, width]);

  useLayoutEffect(() => {
    let lastSecond = -1;
    const point = current.current;
    const shade = reveal.current;
    const marks = trail.current?.children;
    const draw = time => {
      const x = speedPlot ? timeX(time) : positionX(time);
      const y = speedPlot ? speedY(k.vAt(time)) : TRACK_Y;
      point.setAttribute("transform", `translate(${x} ${y})`);
      shade?.setAttribute("width", x - left);
      if (marks) {
        const seconds = Math.floor(Math.min(time, k.tStop));
        if (seconds === lastSecond) return;
        for (let i = 0; i < marks.length; i += 1) marks[i].setAttribute("visibility", i <= seconds ? "visible" : "hidden");
        lastSecond = seconds;
      }
    };
    drawFrame.current = draw;
    draw(timeRef.current);
    return () => { drawFrame.current = null; };
  }, [k, left, positionX, speedPlot, speedY, timeX, drawFrame, timeRef]);

  return <figure ref={frame} className="mm-study-view">
    {speedPlot ? <svg className="mm-study-plot" viewBox={`0 0 ${width} ${HEIGHT}`} role="img"
      aria-label="Скорость от времени. Закрашенная площадь показывает пройденный путь." data-testid="sim-velocity-chart">
      <defs><clipPath id={clip}><rect ref={reveal} x={left} y="0" width="0" height={HEIGHT} /></clipPath></defs>
      {[speedMax / 2, speedMax].map(speed => <g key={speed}>
        <line className="mm-plot-grid" x1={left} y1={speedY(speed)} x2={right} y2={speedY(speed)} />
        <text x={left - 7} y={speedY(speed)} dominantBaseline="middle" textAnchor="end">{fmt(speed, 1)}</text>
      </g>)}
      <path className="mm-plot-axis" d={`M${left} ${TOP}V${BOTTOM}H${right}`} />
      <path className="mm-plot-area" d={area} clipPath={`url(#${clip})`} />
      <path className="mm-velocity-line" d={line} />
      <circle ref={current} className="mm-velocity-current" r="5.5" />
      <text x={left} y="17">м/с</text>
      <text x={left} y="153" textAnchor="middle">0</text>
      <text x={timeX(duration / 2)} y="153" textAnchor="middle">{duration / 2}</text>
      <text x={right} y="153" textAnchor="end">{duration} с</text>
    </svg> : <svg className="mm-study-plot" viewBox={`0 0 ${width} ${HEIGHT}`} role="img"
      aria-label="Положение тела. Точки отмечают его путь через равные промежутки времени, по одной секунде." data-testid="sim-position-chart">
      <text x={left} y="36">Отметки через 1 с</text>
      <line className="mm-track-line" x1={left} y1={TRACK_Y} x2={right} y2={TRACK_Y} />
      <g ref={trail}>
        {Array.from({ length: Math.floor(Math.min(k.tStop, duration)) + 1 }, (_, second) =>
          <circle key={second} className="mm-position-mark" cx={positionX(second)} cy={TRACK_Y} r="3">
            <title>{second} с, {fmt(k.xAt(second), 1)} м</title>
          </circle>)}
      </g>
      <circle ref={current} className="mm-position-current" r="7" />
      <text x={left} y="114" textAnchor="middle">0 м</text>
      <text x={right} y="114" textAnchor="end">{fmt(distanceMax, 1)} м</text>
    </svg>}
  </figure>;
});
